export const mockNow = '2026-01-24T12:00:00Z';

export const operators = [
    {
        id: 'op-prov-001',
        name: 'Taylor Moore',
        providerTeam: 'tier-1',
        technician: 'taylor.m',
        actorType: 'human',
        affiliation: 'provider',
        region: 'NA'
    },
    {
        id: 'op-prov-002',
        name: 'R. Singh',
        providerTeam: 'tier-2',
        technician: 'r.singh',
        actorType: 'human',
        affiliation: 'provider',
        region: 'APAC'
    },
    {
        id: 'op-prov-003',
        name: 'svc-bastion',
        providerTeam: 'platform',
        technician: 'svc-bastion',
        actorType: 'automation',
        affiliation: 'provider',
        region: 'NA'
    },
    {
        id: 'op-prov-004',
        name: 'Night Shift Queue',
        providerTeam: 'tier-2',
        technician: 'night-shift',
        actorType: 'human',
        affiliation: 'provider',
        region: 'EMEA'
    },
    {
        id: 'op-int-001',
        name: 'Alicia Park',
        providerTeam: 'platform',
        technician: 'a.park',
        actorType: 'human',
        affiliation: 'internal',
        region: 'NA'
    },
    {
        id: 'op-int-002',
        name: 'Jules Harper',
        providerTeam: 'db',
        technician: 'j.harper',
        actorType: 'human',
        affiliation: 'internal',
        region: 'EMEA'
    },
    {
        id: 'op-int-003',
        name: 'SecBot 19',
        providerTeam: 'platform',
        technician: 'sec-bot-19',
        actorType: 'automation',
        affiliation: 'internal',
        region: 'NA'
    },
    {
        id: 'op-int-004',
        name: 'BreakGlass Account',
        providerTeam: 'tier-1',
        technician: 'break-glass',
        actorType: 'emergency',
        affiliation: 'internal',
        region: 'NA'
    }
];

export const riskEvents = [
    {
        id: 'risk-001',
        operatorId: 'op-prov-001',
        severity: 'high',
        timestamp: '2026-01-24T08:20:00Z',
        scope: 'identity',
        environment: 'prod',
        ticketLinked: false,
        ticketId: null,
        riskType: 'policy-change',
        summary: 'Conditional access exclusions expanded to legacy admins.',
        sessionId: 'sess-101'
    },
    {
        id: 'risk-002',
        operatorId: 'op-prov-002',
        severity: 'critical',
        timestamp: '2026-01-23T19:05:00Z',
        scope: 'data',
        environment: 'prod',
        ticketLinked: false,
        ticketId: null,
        riskType: 'mass-delete',
        summary: 'Bulk deletion queued for 48 storage containers.',
        sessionId: 'sess-104'
    },
    {
        id: 'risk-003',
        operatorId: 'op-int-003',
        severity: 'medium',
        timestamp: '2026-01-21T11:45:00Z',
        scope: 'privileged',
        environment: 'staging',
        ticketLinked: true,
        ticketId: 'CHG-1042',
        riskType: 'automation-burst',
        summary: 'Automation created 12 privileged sessions in 20 minutes.',
        sessionId: 'sess-112'
    },
    {
        id: 'risk-004',
        operatorId: 'op-prov-004',
        severity: 'high',
        timestamp: '2026-01-15T16:30:00Z',
        scope: 'change',
        environment: 'prod',
        ticketLinked: true,
        ticketId: 'CHG-1033',
        riskType: 'patch-drift',
        summary: 'Privileged hotfix applied outside approved window.',
        sessionId: 'sess-097'
    },
    {
        id: 'risk-005',
        operatorId: 'op-int-002',
        severity: 'medium',
        timestamp: '2025-12-20T05:10:00Z',
        scope: 'data',
        environment: 'prod',
        ticketLinked: true,
        ticketId: 'CHG-0981',
        riskType: 'snapshot-gap',
        summary: 'Backup snapshot skipped for two production clusters.',
        sessionId: 'sess-085'
    },
    {
        id: 'risk-006',
        operatorId: 'op-prov-003',
        severity: 'low',
        timestamp: '2025-12-02T22:00:00Z',
        scope: 'privileged',
        environment: 'dev',
        ticketLinked: true,
        ticketId: 'CHG-0934',
        riskType: 'jit-overshoot',
        summary: 'Just-in-time elevation exceeded configured duration.',
        sessionId: 'sess-074'
    },
    {
        id: 'risk-007',
        operatorId: 'op-int-001',
        severity: 'high',
        timestamp: '2025-11-20T04:48:00Z',
        scope: 'identity',
        environment: 'prod',
        ticketLinked: false,
        ticketId: null,
        riskType: 'provider-overlap',
        summary: 'Provider admin and internal admin changed same policy.',
        sessionId: 'sess-066'
    },
    {
        id: 'risk-008',
        operatorId: 'op-int-004',
        severity: 'critical',
        timestamp: '2025-11-08T13:15:00Z',
        scope: 'privileged',
        environment: 'prod',
        ticketLinked: false,
        ticketId: null,
        riskType: 'break-glass',
        summary: 'Break-glass account used outside incident window.',
        sessionId: 'sess-052'
    }
];

export const changeEvents = [
    {
        id: 'chg-001',
        operatorId: 'op-prov-002',
        resourceId: 'res-entra-ca-001',
        resourceName: 'Conditional Access - Admin MFA',
        changeType: 'policy-update',
        before: {
            state: 'enabled',
            exclusions: 1,
            enforcement: 'block'
        },
        after: {
            state: 'report-only',
            exclusions: 4,
            enforcement: 'monitor'
        },
        riskRating: 'high',
        severity: 'high',
        ticketLinked: false,
        ticketId: null,
        currentState: 'open',
        timestamp: '2026-01-23T03:12:00Z',
        scope: 'change',
        environment: 'prod'
    },
    {
        id: 'chg-002',
        operatorId: 'op-prov-001',
        resourceId: 'res-aws-iam-014',
        resourceName: 'AWS IAM AdminRole',
        changeType: 'role-permission',
        before: {
            permissions: 'AdministratorAccess',
            mfaEnforced: true
        },
        after: {
            permissions: 'AdministratorAccess',
            mfaEnforced: false
        },
        riskRating: 'critical',
        severity: 'critical',
        ticketLinked: false,
        ticketId: null,
        currentState: 'escalated',
        timestamp: '2026-01-24T06:40:00Z',
        scope: 'change',
        environment: 'prod'
    },
    {
        id: 'chg-003',
        operatorId: 'op-int-001',
        resourceId: 'res-azure-sub-017',
        resourceName: 'Azure Subscription Guardrails',
        changeType: 'policy-update',
        before: {
            logging: 'enabled',
            retentionDays: 365
        },
        after: {
            logging: 'enabled',
            retentionDays: 30
        },
        riskRating: 'medium',
        severity: 'medium',
        ticketLinked: true,
        ticketId: 'CHG-1049',
        currentState: 'monitoring',
        timestamp: '2026-01-20T12:00:00Z',
        scope: 'change',
        environment: 'prod'
    },
    {
        id: 'chg-004',
        operatorId: 'op-int-002',
        resourceId: 'res-db-audit-002',
        resourceName: 'SQL Audit Policy',
        changeType: 'policy-update',
        before: {
            auditLevel: 'all',
            storage: 'immutable'
        },
        after: {
            auditLevel: 'read-only',
            storage: 'standard'
        },
        riskRating: 'high',
        severity: 'high',
        ticketLinked: true,
        ticketId: 'CHG-1014',
        currentState: 'review',
        timestamp: '2026-01-14T09:05:00Z',
        scope: 'change',
        environment: 'prod'
    },
    {
        id: 'chg-005',
        operatorId: 'op-prov-003',
        resourceId: 'res-gcp-kms-002',
        resourceName: 'GCP KMS Keyring',
        changeType: 'key-rotation',
        before: {
            rotation: '90d',
            status: 'enabled'
        },
        after: {
            rotation: 'manual',
            status: 'enabled'
        },
        riskRating: 'medium',
        severity: 'medium',
        ticketLinked: true,
        ticketId: 'CHG-0991',
        currentState: 'closed',
        timestamp: '2025-12-18T21:15:00Z',
        scope: 'change',
        environment: 'staging'
    },
    {
        id: 'chg-006',
        operatorId: 'op-int-004',
        resourceId: 'res-okta-mfa-009',
        resourceName: 'Okta MFA Factor',
        changeType: 'emergency-disable',
        before: {
            factor: 'webauthn',
            status: 'enabled'
        },
        after: {
            factor: 'webauthn',
            status: 'disabled'
        },
        riskRating: 'critical',
        severity: 'critical',
        ticketLinked: false,
        ticketId: null,
        currentState: 'open',
        timestamp: '2025-11-09T11:30:00Z',
        scope: 'change',
        environment: 'prod'
    }
];

export const privilegedSignIns = [
    {
        id: 'signin-001',
        sessionId: 'sess-101',
        operatorId: 'op-prov-001',
        timestamp: '2026-01-24T07:05:00Z',
        hourOfDay: 7,
        geo: 'US-CA',
        ip: '203.0.113.8',
        anomalyFlags: ['impossible-travel'],
        severity: 'high',
        scope: 'privileged',
        environment: 'prod',
        ticketLinked: true
    },
    {
        id: 'signin-002',
        sessionId: 'sess-104',
        operatorId: 'op-prov-002',
        timestamp: '2026-01-23T18:40:00Z',
        hourOfDay: 18,
        geo: 'SG',
        ip: '198.51.100.22',
        anomalyFlags: ['new-geo'],
        severity: 'medium',
        scope: 'privileged',
        environment: 'prod',
        ticketLinked: false
    },
    {
        id: 'signin-003',
        sessionId: 'sess-105',
        operatorId: 'op-prov-003',
        timestamp: '2026-01-22T03:20:00Z',
        hourOfDay: 3,
        geo: 'US-VA',
        ip: '192.0.2.44',
        anomalyFlags: [],
        severity: 'low',
        scope: 'privileged',
        environment: 'dev',
        ticketLinked: true
    },
    {
        id: 'signin-004',
        sessionId: 'sess-097',
        operatorId: 'op-prov-004',
        timestamp: '2026-01-15T15:55:00Z',
        hourOfDay: 15,
        geo: 'IE',
        ip: '203.0.113.19',
        anomalyFlags: ['after-hours'],
        severity: 'medium',
        scope: 'privileged',
        environment: 'prod',
        ticketLinked: true
    },
    {
        id: 'signin-005',
        sessionId: 'sess-112',
        operatorId: 'op-int-003',
        timestamp: '2026-01-21T10:05:00Z',
        hourOfDay: 10,
        geo: 'US-OR',
        ip: '198.51.100.81',
        anomalyFlags: [],
        severity: 'low',
        scope: 'privileged',
        environment: 'staging',
        ticketLinked: true
    },
    {
        id: 'signin-006',
        sessionId: 'sess-085',
        operatorId: 'op-int-002',
        timestamp: '2025-12-20T04:32:00Z',
        hourOfDay: 4,
        geo: 'DE',
        ip: '192.0.2.18',
        anomalyFlags: ['unusual-ip'],
        severity: 'medium',
        scope: 'privileged',
        environment: 'prod',
        ticketLinked: true
    },
    {
        id: 'signin-007',
        sessionId: 'sess-066',
        operatorId: 'op-int-001',
        timestamp: '2025-11-20T03:55:00Z',
        hourOfDay: 3,
        geo: 'US-NY',
        ip: '203.0.113.51',
        anomalyFlags: ['after-hours'],
        severity: 'medium',
        scope: 'privileged',
        environment: 'prod',
        ticketLinked: false
    },
    {
        id: 'signin-008',
        sessionId: 'sess-052',
        operatorId: 'op-int-004',
        timestamp: '2025-11-08T12:40:00Z',
        hourOfDay: 12,
        geo: 'US-TX',
        ip: '198.51.100.31',
        anomalyFlags: ['break-glass'],
        severity: 'critical',
        scope: 'privileged',
        environment: 'prod',
        ticketLinked: false
    }
];

export const elevations = [
    {
        id: 'elev-001',
        operatorId: 'op-prov-003',
        elevationType: 'PIM',
        method: 'just-in-time',
        startTime: '2026-01-24T05:00:00Z',
        endTime: '2026-01-24T06:00:00Z',
        durationMins: 60,
        ticketLinked: true,
        ticketId: 'CHG-1042',
        severity: 'low',
        scope: 'privileged',
        environment: 'prod'
    },
    {
        id: 'elev-002',
        operatorId: 'op-prov-001',
        elevationType: 'standing',
        method: 'role-assignment',
        startTime: '2026-01-23T07:30:00Z',
        endTime: '2026-01-23T11:30:00Z',
        durationMins: 240,
        ticketLinked: false,
        ticketId: null,
        severity: 'medium',
        scope: 'privileged',
        environment: 'prod'
    },
    {
        id: 'elev-003',
        operatorId: 'op-prov-004',
        elevationType: 'PIM',
        method: 'approval',
        startTime: '2026-01-15T14:40:00Z',
        endTime: '2026-01-15T16:10:00Z',
        durationMins: 90,
        ticketLinked: true,
        ticketId: 'CHG-1033',
        severity: 'low',
        scope: 'privileged',
        environment: 'prod'
    },
    {
        id: 'elev-004',
        operatorId: 'op-int-004',
        elevationType: 'break-glass',
        method: 'emergency',
        startTime: '2025-11-08T12:30:00Z',
        endTime: '2025-11-08T14:00:00Z',
        durationMins: 90,
        ticketLinked: false,
        ticketId: null,
        severity: 'critical',
        scope: 'privileged',
        environment: 'prod'
    },
    {
        id: 'elev-005',
        operatorId: 'op-int-002',
        elevationType: 'standing',
        method: 'role-assignment',
        startTime: '2025-12-20T03:50:00Z',
        endTime: '2025-12-20T05:20:00Z',
        durationMins: 90,
        ticketLinked: true,
        ticketId: 'CHG-0981',
        severity: 'medium',
        scope: 'privileged',
        environment: 'prod'
    }
];

export const monitoringIngestionStatuses = [
    {
        id: 'ing-001',
        source: 'Azure AD Sign-In',
        status: 'healthy',
        lastSeen: '2026-01-24T11:50:00Z',
        lagMinutes: 3,
        severity: 'low',
        scope: 'identity',
        environment: 'prod',
        providerTeam: 'platform',
        ticketLinked: true
    },
    {
        id: 'ing-002',
        source: 'AWS CloudTrail',
        status: 'degraded',
        lastSeen: '2026-01-24T10:40:00Z',
        lagMinutes: 65,
        severity: 'medium',
        scope: 'change',
        environment: 'prod',
        providerTeam: 'platform',
        ticketLinked: true
    },
    {
        id: 'ing-003',
        source: 'GCP Admin Activity',
        status: 'outage',
        lastSeen: '2026-01-24T08:10:00Z',
        lagMinutes: 180,
        severity: 'high',
        scope: 'change',
        environment: 'staging',
        providerTeam: 'tier-2',
        ticketLinked: false
    },
    {
        id: 'ing-004',
        source: 'Okta System Logs',
        status: 'healthy',
        lastSeen: '2026-01-24T11:52:00Z',
        lagMinutes: 4,
        severity: 'low',
        scope: 'identity',
        environment: 'prod',
        providerTeam: 'tier-1',
        ticketLinked: true
    }
];

export const controlTamperingAttempts = [
    {
        id: 'tamper-001',
        operatorId: 'op-prov-004',
        control: 'EDR sensor',
        method: 'service-stop',
        timestamp: '2026-01-22T02:40:00Z',
        severity: 'high',
        scope: 'data',
        environment: 'prod',
        ticketLinked: false,
        ticketId: null
    },
    {
        id: 'tamper-002',
        operatorId: 'op-prov-003',
        control: 'Audit pipeline',
        method: 'buffer-flush',
        timestamp: '2026-01-21T18:25:00Z',
        severity: 'medium',
        scope: 'change',
        environment: 'staging',
        ticketLinked: true,
        ticketId: 'CHG-1042'
    },
    {
        id: 'tamper-003',
        operatorId: 'op-int-004',
        control: 'MFA enforcement',
        method: 'policy-disable',
        timestamp: '2025-11-08T12:05:00Z',
        severity: 'critical',
        scope: 'identity',
        environment: 'prod',
        ticketLinked: false,
        ticketId: null
    },
    {
        id: 'tamper-004',
        operatorId: 'op-int-001',
        control: 'SIEM forwarding',
        method: 'routing-change',
        timestamp: '2025-12-01T09:55:00Z',
        severity: 'medium',
        scope: 'change',
        environment: 'prod',
        ticketLinked: true,
        ticketId: 'CHG-0999'
    }
];

export const uebaSummaries = [
    {
        id: 'ueba-001',
        operatorId: 'op-prov-001',
        baseline: {
            sessionsPerDay: 3,
            avgDurationMins: 25,
            uniqueIps: 1
        },
        current: {
            sessionsPerDay: 7,
            avgDurationMins: 62,
            uniqueIps: 3
        },
        delta: {
            sessionsPerDay: 4,
            avgDurationMins: 37,
            uniqueIps: 2
        },
        anomalyScore: 72,
        severity: 'medium',
        scope: 'privileged',
        environment: 'prod',
        sampleTime: '2026-01-24T09:30:00Z',
        ticketLinked: true
    },
    {
        id: 'ueba-002',
        operatorId: 'op-prov-002',
        baseline: {
            sessionsPerDay: 2,
            avgDurationMins: 18,
            uniqueIps: 1
        },
        current: {
            sessionsPerDay: 5,
            avgDurationMins: 41,
            uniqueIps: 2
        },
        delta: {
            sessionsPerDay: 3,
            avgDurationMins: 23,
            uniqueIps: 1
        },
        anomalyScore: 81,
        severity: 'high',
        scope: 'privileged',
        environment: 'prod',
        sampleTime: '2026-01-23T18:10:00Z',
        ticketLinked: false
    },
    {
        id: 'ueba-003',
        operatorId: 'op-prov-003',
        baseline: {
            sessionsPerDay: 10,
            avgDurationMins: 5,
            uniqueIps: 1
        },
        current: {
            sessionsPerDay: 14,
            avgDurationMins: 7,
            uniqueIps: 2
        },
        delta: {
            sessionsPerDay: 4,
            avgDurationMins: 2,
            uniqueIps: 1
        },
        anomalyScore: 44,
        severity: 'low',
        scope: 'privileged',
        environment: 'dev',
        sampleTime: '2026-01-22T03:10:00Z',
        ticketLinked: true
    },
    {
        id: 'ueba-004',
        operatorId: 'op-int-002',
        baseline: {
            sessionsPerDay: 2,
            avgDurationMins: 20,
            uniqueIps: 1
        },
        current: {
            sessionsPerDay: 3,
            avgDurationMins: 45,
            uniqueIps: 1
        },
        delta: {
            sessionsPerDay: 1,
            avgDurationMins: 25,
            uniqueIps: 0
        },
        anomalyScore: 55,
        severity: 'medium',
        scope: 'privileged',
        environment: 'prod',
        sampleTime: '2025-12-20T05:05:00Z',
        ticketLinked: true
    },
    {
        id: 'ueba-005',
        operatorId: 'op-int-004',
        baseline: {
            sessionsPerDay: 0,
            avgDurationMins: 0,
            uniqueIps: 0
        },
        current: {
            sessionsPerDay: 1,
            avgDurationMins: 95,
            uniqueIps: 1
        },
        delta: {
            sessionsPerDay: 1,
            avgDurationMins: 95,
            uniqueIps: 1
        },
        anomalyScore: 95,
        severity: 'critical',
        scope: 'privileged',
        environment: 'prod',
        sampleTime: '2025-11-08T12:45:00Z',
        ticketLinked: false
    }
];

export const blastRadiusEvents = [
    {
        id: 'blast-001',
        operatorId: 'op-prov-002',
        eventType: 'mass-delete',
        resourceIds: ['res-s3-logs-009', 'res-s3-logs-010', 'res-s3-logs-011'],
        resourcesImpacted: 48,
        severity: 'critical',
        timestamp: '2026-01-21T13:22:00Z',
        scope: 'data',
        environment: 'prod',
        ticketLinked: false,
        ticketId: null
    },
    {
        id: 'blast-002',
        operatorId: 'op-int-002',
        eventType: 'backup-disable',
        resourceIds: ['res-db-backup-004'],
        resourcesImpacted: 3,
        severity: 'high',
        timestamp: '2025-12-20T05:12:00Z',
        scope: 'data',
        environment: 'prod',
        ticketLinked: true,
        ticketId: 'CHG-0981'
    },
    {
        id: 'blast-003',
        operatorId: 'op-prov-003',
        eventType: 'key-rotation',
        resourceIds: ['res-gcp-kms-002'],
        resourcesImpacted: 1,
        severity: 'medium',
        timestamp: '2025-12-18T21:20:00Z',
        scope: 'change',
        environment: 'staging',
        ticketLinked: true,
        ticketId: 'CHG-0991'
    },
    {
        id: 'blast-004',
        operatorId: 'op-int-004',
        eventType: 'identity-shutdown',
        resourceIds: ['res-okta-mfa-009'],
        resourcesImpacted: 5,
        severity: 'critical',
        timestamp: '2025-11-09T11:35:00Z',
        scope: 'identity',
        environment: 'prod',
        ticketLinked: false,
        ticketId: null
    }
];
