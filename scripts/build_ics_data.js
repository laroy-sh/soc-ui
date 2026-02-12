#!/usr/bin/env node
/**
 * Fetches MITRE ATT&CK for ICS STIX data and transforms it into
 * a dashboardData JSON object for embedding in mitre-ics.js.
 *
 * Usage: node scripts/build_ics_data.js > ics_data.json
 */

const STIX_URL = 'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/ics-attack/ics-attack.json';

async function fetchStixData() {
    const resp = await fetch(STIX_URL);
    if (!resp.ok) throw new Error(`Failed to fetch STIX data: ${resp.status}`);
    return resp.json();
}

function externalId(obj) {
    const ref = (obj.external_references || []).find(r => r.source_name === 'mitre-attack');
    return ref ? ref.external_id : null;
}

function mitreUrl(obj) {
    const ref = (obj.external_references || []).find(r => r.source_name === 'mitre-attack');
    return ref ? ref.url : null;
}

function isIcs(obj) {
    return (obj.x_mitre_domains || []).includes('ics-attack');
}

function notRevoked(obj) {
    return !obj.revoked && !obj.x_mitre_deprecated;
}

async function main() {
    const bundle = await fetchStixData();
    const objects = bundle.objects;

    // Build UUID lookup
    const byId = new Map();
    for (const obj of objects) {
        byId.set(obj.id, obj);
    }

    // Extract tactics
    const tactics = objects
        .filter(o => o.type === 'x-mitre-tactic' && isIcs(o) && notRevoked(o))
        .map(o => ({
            id: externalId(o),
            name: o.name,
            shortname: o.x_mitre_shortname,
            description: (o.description || '').replace(/\n/g, ' ').trim()
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    // Tactic shortname to ID map
    const tacticShortToId = new Map();
    for (const t of tactics) {
        tacticShortToId.set(t.shortname, t.id);
    }

    // Extract relationships
    const relationships = objects.filter(o => o.type === 'relationship' && notRevoked(o));

    // Build relationship maps
    const techToAssets = new Map();   // technique UUID -> asset UUIDs
    const techToGroups = new Map();   // technique UUID -> group UUIDs
    const techToSoftware = new Map(); // technique UUID -> software UUIDs
    const techToMitigations = new Map(); // technique UUID -> mitigation UUIDs
    const groupToTechs = new Map();
    const groupToSoftware = new Map();
    const softwareToTechs = new Map();
    const mitigationToTechs = new Map();
    const assetToTechs = new Map();
    const campaignToTechs = new Map();
    const campaignToGroups = new Map();

    for (const rel of relationships) {
        const src = rel.source_ref;
        const tgt = rel.target_ref;
        const type = rel.relationship_type;

        if (type === 'uses' && src.startsWith('intrusion-set') && tgt.startsWith('attack-pattern')) {
            if (!groupToTechs.has(src)) groupToTechs.set(src, new Set());
            groupToTechs.get(src).add(tgt);
            if (!techToGroups.has(tgt)) techToGroups.set(tgt, new Set());
            techToGroups.get(tgt).add(src);
        }
        if (type === 'uses' && src.startsWith('intrusion-set') && (tgt.startsWith('malware') || tgt.startsWith('tool'))) {
            if (!groupToSoftware.has(src)) groupToSoftware.set(src, new Set());
            groupToSoftware.get(src).add(tgt);
        }
        if (type === 'uses' && (src.startsWith('malware') || src.startsWith('tool')) && tgt.startsWith('attack-pattern')) {
            if (!softwareToTechs.has(src)) softwareToTechs.set(src, new Set());
            softwareToTechs.get(src).add(tgt);
            if (!techToSoftware.has(tgt)) techToSoftware.set(tgt, new Set());
            techToSoftware.get(tgt).add(src);
        }
        if (type === 'mitigates' && src.startsWith('course-of-action') && tgt.startsWith('attack-pattern')) {
            if (!mitigationToTechs.has(src)) mitigationToTechs.set(src, new Set());
            mitigationToTechs.get(src).add(tgt);
            if (!techToMitigations.has(tgt)) techToMitigations.set(tgt, new Set());
            techToMitigations.get(tgt).add(src);
        }
        if (type === 'targets' && src.startsWith('attack-pattern') && tgt.startsWith('x-mitre-asset')) {
            if (!techToAssets.has(src)) techToAssets.set(src, new Set());
            techToAssets.get(src).add(tgt);
            if (!assetToTechs.has(tgt)) assetToTechs.set(tgt, new Set());
            assetToTechs.get(tgt).add(src);
        }
        if (type === 'uses' && src.startsWith('campaign') && tgt.startsWith('attack-pattern')) {
            if (!campaignToTechs.has(src)) campaignToTechs.set(src, new Set());
            campaignToTechs.get(src).add(tgt);
        }
        if (type === 'attributed-to' && src.startsWith('campaign') && tgt.startsWith('intrusion-set')) {
            if (!campaignToGroups.has(src)) campaignToGroups.set(src, new Set());
            campaignToGroups.get(src).add(tgt);
        }
    }

    function resolveIds(uuidSet, fallback) {
        if (!uuidSet) return fallback || [];
        return [...uuidSet].map(uuid => {
            const obj = byId.get(uuid);
            return obj ? externalId(obj) : null;
        }).filter(Boolean);
    }

    // Extract techniques
    const techniques = objects
        .filter(o => o.type === 'attack-pattern' && isIcs(o) && notRevoked(o))
        .map(o => {
            const mid = externalId(o);
            const tacticList = (o.kill_chain_phases || [])
                .filter(p => p.kill_chain_name === 'mitre-ics-attack')
                .map(p => p.phase_name);
            const tacticIds = tacticList.map(s => tacticShortToId.get(s)).filter(Boolean);

            return {
                id: o.id,
                mitre_id: mid,
                name: o.name,
                description: (o.description || '').replace(/\n/g, ' ').trim(),
                tactics: tacticIds,
                tacticNames: tacticList,
                platforms: o.x_mitre_platforms || [],
                dataSources: (o.x_mitre_data_sources || []),
                assets: resolveIds(techToAssets.get(o.id)),
                groups: resolveIds(techToGroups.get(o.id)),
                software: resolveIds(techToSoftware.get(o.id)),
                mitigations: resolveIds(techToMitigations.get(o.id)),
                url: mitreUrl(o)
            };
        })
        .sort((a, b) => a.mitre_id.localeCompare(b.mitre_id));

    // Extract groups
    const groups = objects
        .filter(o => o.type === 'intrusion-set' && isIcs(o) && notRevoked(o))
        .map(o => ({
            id: externalId(o),
            name: o.name,
            aliases: o.aliases || [],
            description: (o.description || '').replace(/\n/g, ' ').trim(),
            techniques: resolveIds(groupToTechs.get(o.id)),
            software: resolveIds(groupToSoftware.get(o.id)),
            url: mitreUrl(o)
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    // Extract software (malware + tools)
    const software = objects
        .filter(o => (o.type === 'malware' || o.type === 'tool') && isIcs(o) && notRevoked(o))
        .map(o => ({
            id: externalId(o),
            name: o.name,
            type: o.type === 'malware' ? 'Malware' : 'Tool',
            description: (o.description || '').replace(/\n/g, ' ').trim(),
            platforms: o.x_mitre_platforms || [],
            techniques: resolveIds(softwareToTechs.get(o.id)),
            url: mitreUrl(o)
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    // Extract mitigations
    const mitigations = objects
        .filter(o => o.type === 'course-of-action' && isIcs(o) && notRevoked(o))
        .map(o => ({
            id: externalId(o),
            name: o.name,
            description: (o.description || '').replace(/\n/g, ' ').trim(),
            techniques: resolveIds(mitigationToTechs.get(o.id)),
            url: mitreUrl(o)
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    // Extract assets (ICS-unique)
    const assets = objects
        .filter(o => o.type === 'x-mitre-asset' && notRevoked(o))
        .map(o => ({
            id: externalId(o),
            name: o.name,
            description: (o.description || '').replace(/\n/g, ' ').trim(),
            sectors: o.x_mitre_sectors || [],
            relatedAssets: (o.x_mitre_related_assets || []).map(ra => ({
                name: ra.name || ra.related_asset_name || '',
                description: ra.description || '',
                sectors: ra.related_asset_sectors || []
            })),
            techniques: resolveIds(assetToTechs.get(o.id)),
            url: mitreUrl(o)
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    // Extract campaigns
    const campaigns = objects
        .filter(o => o.type === 'campaign' && isIcs(o) && notRevoked(o))
        .map(o => ({
            id: externalId(o),
            name: o.name,
            description: (o.description || '').replace(/\n/g, ' ').trim(),
            firstSeen: o.first_seen || '',
            lastSeen: o.last_seen || '',
            techniques: resolveIds(campaignToTechs.get(o.id)),
            groups: resolveIds(campaignToGroups.get(o.id)),
            url: mitreUrl(o)
        }))
        .sort((a, b) => a.id.localeCompare(b.id));

    // Get version info
    const collection = objects.find(o => o.type === 'x-mitre-collection');
    const version = collection ? collection.x_mitre_version : 'unknown';

    const dashboardData = {
        stats: {
            version,
            lastUpdate: new Date().toISOString().split('T')[0],
            techniques: techniques.length,
            groups: groups.length,
            software: software.length,
            mitigations: mitigations.length,
            assets: assets.length,
            campaigns: campaigns.length
        },
        tactics,
        techniques: techniques.map(t => {
            const { id, ...rest } = t;
            return rest;
        }),
        groups,
        software,
        mitigations,
        assets,
        campaigns
    };

    console.log(JSON.stringify(dashboardData, null, 2));
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
