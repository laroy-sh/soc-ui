/**
 * MITRE ATT&CK for ICS Dashboard - Complete JavaScript
 * Renders the interactive MITRE ATT&CK for ICS matrix, technique browser,
 * asset viewer, group/software/mitigation/campaign cards, and detail modals.
 *
 * Architecture follows the Essential Eight dashboard pattern:
 *   - Data embedded as a const at the top
 *   - DOMContentLoaded guard scoped to .mitre-ics container
 *   - All globals prefixed with mics to avoid conflicts
 */

// =============================================================================
// Embedded Data (sourced from MITRE ATT&CK for ICS v18.1)
// =============================================================================

const mitreIcsData = {
  stats: {
    version: "18.1",
    lastUpdate: "2026-02-12",
    techniques: 83,
    groups: 14,
    software: 23,
    mitigations: 52,
    assets: 18,
    campaigns: 7
  },
  tactics: [
    { id: "TA0100", name: "Collection", shortname: "collection" },
    { id: "TA0101", name: "Command and Control", shortname: "command-and-control" },
    { id: "TA0102", name: "Discovery", shortname: "discovery" },
    { id: "TA0103", name: "Evasion", shortname: "evasion" },
    { id: "TA0104", name: "Execution", shortname: "execution" },
    { id: "TA0105", name: "Impact", shortname: "impact" },
    { id: "TA0106", name: "Impair Process Control", shortname: "impair-process-control" },
    { id: "TA0107", name: "Inhibit Response Function", shortname: "inhibit-response-function" },
    { id: "TA0108", name: "Initial Access", shortname: "initial-access" },
    { id: "TA0109", name: "Lateral Movement", shortname: "lateral-movement" },
    { id: "TA0110", name: "Persistence", shortname: "persistence" },
    { id: "TA0111", name: "Privilege Escalation", shortname: "privilege-escalation" }
  ],
  techniques: [
    { mitre_id: "T0800", name: "Activate Firmware Update Mode", tactics: ["TA0107"], platforms: ["None"], assets: ["A0002","A0009","A0018","A0017","A0010","A0004","A0005","A0013","A0003"], groups: [], software: ["S0604"], mitigations: ["M0807","M0804","M0813","M0802","M0801","M0937","M0930","M0800"], url: "https://attack.mitre.org/techniques/T0800" },
    { mitre_id: "T0801", name: "Monitor Process State", tactics: ["TA0100"], platforms: ["None"], assets: ["A0018","A0010","A0005","A0013","A0002","A0004","A0006","A0007","A0003","A0017","A0009"], groups: [], software: ["S0603","S1165","S1072","S0604"], mitigations: ["M0816"], url: "https://attack.mitre.org/techniques/T0801" },
    { mitre_id: "T0802", name: "Automated Collection", tactics: ["TA0100"], platforms: ["None"], assets: ["A0017","A0007","A0003","A0018","A0006"], groups: [], software: ["S1072","S0093","S0604"], mitigations: ["M0807","M0930"], url: "https://attack.mitre.org/techniques/T0802" },
    { mitre_id: "T0803", name: "Block Command Message", tactics: ["TA0107"], platforms: ["None"], assets: ["A0005","A0013","A0010","A0007","A0018","A0003","A0004","A0002","A0017"], groups: [], software: ["S0604"], mitigations: ["M0810","M0807","M0814"], url: "https://attack.mitre.org/techniques/T0803" },
    { mitre_id: "T0804", name: "Block Reporting Message", tactics: ["TA0107"], platforms: ["None"], assets: ["A0013","A0003","A0002","A0007","A0004","A0018","A0009","A0005","A0017","A0010"], groups: [], software: ["S0604"], mitigations: ["M0814","M0810","M0807"], url: "https://attack.mitre.org/techniques/T0804" },
    { mitre_id: "T0805", name: "Block Serial COM", tactics: ["TA0107"], platforms: ["None"], assets: ["A0001","A0018","A0017","A0011","A0007","A0005","A0013","A0012","A0009","A0004","A0010","A0002","A0003"], groups: [], software: ["S0604"], mitigations: ["M0930","M0810","M0807"], url: "https://attack.mitre.org/techniques/T0805" },
    { mitre_id: "T0806", name: "Brute Force I/O", tactics: ["TA0106"], platforms: ["None"], assets: ["A0005","A0003","A0017","A0002","A0007","A0004","A0010","A0018"], groups: [], software: ["S1072","S1157","S0604"], mitigations: ["M0807","M0930","M0937","M0813"], url: "https://attack.mitre.org/techniques/T0806" },
    { mitre_id: "T0807", name: "Command-Line Interface", tactics: ["TA0104"], platforms: ["None"], assets: ["A0002","A0009","A0008","A0007","A0012","A0001","A0015","A0006","A0016"], groups: ["G0034"], software: ["S0604","S0603","S1165"], mitigations: ["M0938","M0942"], url: "https://attack.mitre.org/techniques/T0807" },
    { mitre_id: "T0809", name: "Data Destruction", tactics: ["TA0107"], platforms: ["None"], assets: ["A0004","A0014","A0016","A0007","A0008","A0011","A0018","A0010","A0017","A0001","A0009","A0013","A0012","A0015","A0003","A0002","A0006","A0005"], groups: [], software: ["S0604","S0607","S1045","S1157"], mitigations: ["M0922","M0953","M0926"], url: "https://attack.mitre.org/techniques/T0809" },
    { mitre_id: "T0811", name: "Data from Information Repositories", tactics: ["TA0100"], platforms: ["None"], assets: ["A0006","A0007"], groups: [], software: ["S0038"], mitigations: ["M0947","M0941","M0922","M0918","M0926","M0917"], url: "https://attack.mitre.org/techniques/T0811" },
    { mitre_id: "T0812", name: "Default Credentials", tactics: ["TA0109"], platforms: ["None"], assets: ["A0003","A0017","A0004","A0012","A0005","A0001","A0016","A0010","A0014","A0008","A0002","A0007","A0015","A0018","A0009","A0006","A0013","A0011"], groups: [], software: [], mitigations: ["M0927","M0801"], url: "https://attack.mitre.org/techniques/T0812" },
    { mitre_id: "T0813", name: "Denial of Control", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S0604"], mitigations: ["M0810","M0953","M0811"], url: "https://attack.mitre.org/techniques/T0813" },
    { mitre_id: "T0814", name: "Denial of Service", tactics: ["TA0107"], platforms: ["None"], assets: ["A0012","A0016","A0009","A0013","A0006","A0010","A0002","A0005","A0017","A0018","A0003","A0004","A0015","A0007"], groups: [], software: ["S0604","S1006","S1157","S0093"], mitigations: ["M0815"], url: "https://attack.mitre.org/techniques/T0814" },
    { mitre_id: "T0815", name: "Denial of View", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S0604"], mitigations: ["M0810","M0953","M0811"], url: "https://attack.mitre.org/techniques/T0815" },
    { mitre_id: "T0816", name: "Device Restart/Shutdown", tactics: ["TA0107"], platforms: ["None"], assets: ["A0001","A0002","A0011","A0005","A0012","A0014","A0015","A0006","A0004","A0018","A0017","A0016","A0013","A0008","A0003","A0009","A0007","A0010"], groups: [], software: ["S0604"], mitigations: ["M0807","M0804","M0930","M0802","M0800","M0942","M0937","M0801","M0813"], url: "https://attack.mitre.org/techniques/T0816" },
    { mitre_id: "T0817", name: "Drive-by Compromise", tactics: ["TA0108"], platforms: ["None"], assets: ["A0001"], groups: ["G0035","G0088","G0049","G1000"], software: ["S0606"], mitigations: ["M0951","M0948","M0950","M0921"], url: "https://attack.mitre.org/techniques/T0817" },
    { mitre_id: "T0819", name: "Exploit Public-Facing Application", tactics: ["TA0108"], platforms: ["None"], assets: ["A0008","A0011","A0001","A0016"], groups: ["G0034"], software: [], mitigations: ["M0951","M0916","M0950","M0926","M0948","M0930"], url: "https://attack.mitre.org/techniques/T0819" },
    { mitre_id: "T0820", name: "Exploitation for Evasion", tactics: ["TA0103"], platforms: ["None"], assets: ["A0001","A0005","A0016","A0018","A0012","A0009","A0017","A0006","A0014","A0010","A0007","A0011","A0015","A0003","A0002","A0008"], groups: [], software: ["S1009"], mitigations: ["M0919","M0950","M0948","M0951"], url: "https://attack.mitre.org/techniques/T0820" },
    { mitre_id: "T0821", name: "Modify Controller Tasking", tactics: ["TA0104"], platforms: ["None"], assets: ["A0017","A0010","A0018","A0003"], groups: [], software: ["S1006","S1009","S0603"], mitigations: ["M0800","M0804","M0947","M0945"], url: "https://attack.mitre.org/techniques/T0821" },
    { mitre_id: "T0822", name: "External Remote Services", tactics: ["TA0108"], platforms: ["None"], assets: ["A0016","A0014","A0009","A0008","A0017","A0011","A0015","A0012","A0006"], groups: [], software: ["S1157"], mitigations: ["M0930","M0936","M0935","M0927","M0918","M0942","M0932"], url: "https://attack.mitre.org/techniques/T0822" },
    { mitre_id: "T0823", name: "Graphical User Interface", tactics: ["TA0104"], platforms: ["None"], assets: ["A0009","A0006","A0015","A0002","A0016","A0012","A0001","A0007","A0008"], groups: [], software: [], mitigations: ["M0816"], url: "https://attack.mitre.org/techniques/T0823" },
    { mitre_id: "T0826", name: "Loss of Availability", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S0608"], mitigations: ["M0810","M0811","M0953"], url: "https://attack.mitre.org/techniques/T0826" },
    { mitre_id: "T0827", name: "Loss of Control", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S0604","S0372"], mitigations: ["M0953","M0811","M0810"], url: "https://attack.mitre.org/techniques/T0827" },
    { mitre_id: "T0828", name: "Loss of Productivity and Revenue", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S0446","S0372","S0608","S0368","S0605","S0496","S0606"], mitigations: ["M0953"], url: "https://attack.mitre.org/techniques/T0828" },
    { mitre_id: "T0829", name: "Loss of View", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S0607","S1157","S0372","S0604"], mitigations: ["M0811","M0810","M0953"], url: "https://attack.mitre.org/techniques/T0829" },
    { mitre_id: "T0830", name: "Adversary-in-the-Middle", tactics: ["TA0100"], platforms: ["None"], assets: ["A0005","A0014","A0012","A0017","A0006","A0016","A0015","A0008","A0002","A0010","A0011","A0018","A0001","A0009","A0007","A0003","A0013","A0004"], groups: [], software: ["S1010"], mitigations: ["M0930","M0810","M0813","M0814","M0931","M0947","M0942","M0802"], url: "https://attack.mitre.org/techniques/T0830" },
    { mitre_id: "T0831", name: "Manipulation of Control", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S0604","S0603"], mitigations: ["M0810","M0953","M0802"], url: "https://attack.mitre.org/techniques/T0831" },
    { mitre_id: "T0832", name: "Manipulation of View", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S0604","S0603"], mitigations: ["M0802","M0810","M0953"], url: "https://attack.mitre.org/techniques/T0832" },
    { mitre_id: "T0834", name: "Native API", tactics: ["TA0104"], platforms: ["None"], assets: ["A0010","A0015","A0007","A0012","A0017","A0009","A0002","A0008","A0004","A0005","A0018","A0016","A0001","A0013","A0003","A0006","A0011"], groups: [], software: ["S1009","S1006","S0603"], mitigations: ["M0938"], url: "https://attack.mitre.org/techniques/T0834" },
    { mitre_id: "T0835", name: "Manipulate I/O Image", tactics: ["TA0107"], platforms: ["None"], assets: ["A0017","A0010","A0018","A0003"], groups: [], software: ["S1006","S0603"], mitigations: ["M0816"], url: "https://attack.mitre.org/techniques/T0835" },
    { mitre_id: "T0836", name: "Modify Parameter", tactics: ["TA0106"], platforms: ["None"], assets: ["A0005","A0017","A0003","A0004","A0018"], groups: [], software: ["S1165","S1045","S0603","S1072"], mitigations: ["M0947","M0804","M0800","M0818"], url: "https://attack.mitre.org/techniques/T0836" },
    { mitre_id: "T0837", name: "Loss of Protection", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S0604"], mitigations: [], url: "https://attack.mitre.org/techniques/T0837" },
    { mitre_id: "T0838", name: "Modify Alarm Settings", tactics: ["TA0107"], platforms: ["None"], assets: ["A0018","A0009","A0002","A0017","A0005","A0003","A0010","A0004"], groups: [], software: [], mitigations: ["M0804","M0930","M0807","M0813","M0800","M0918","M0801"], url: "https://attack.mitre.org/techniques/T0838" },
    { mitre_id: "T0839", name: "Module Firmware", tactics: ["TA0110","TA0106"], platforms: ["None"], assets: ["A0017","A0018","A0010","A0003"], groups: [], software: [], mitigations: ["M0941","M0946","M0813","M0937","M0808","M0945","M0947","M0802","M0804","M0930","M0801","M0807"], url: "https://attack.mitre.org/techniques/T0839" },
    { mitre_id: "T0840", name: "Network Connection Enumeration", tactics: ["TA0102"], platforms: ["None"], assets: ["A0001","A0011","A0012","A0015","A0002","A0016","A0009","A0017","A0010","A0005","A0003","A0006","A0007","A0008","A0004","A0018"], groups: [], software: ["S0605","S0604"], mitigations: ["M0816"], url: "https://attack.mitre.org/techniques/T0840" },
    { mitre_id: "T0842", name: "Network Sniffing", tactics: ["TA0102"], platforms: ["None"], assets: ["A0001","A0007","A0004","A0005","A0016","A0008","A0006","A0010","A0009","A0003","A0002","A0017","A0011","A0012","A0015","A0018"], groups: [], software: ["S1010","S1045","S0603"], mitigations: ["M0926","M0930","M0932","M0808","M0814"], url: "https://attack.mitre.org/techniques/T0842" },
    { mitre_id: "T0843", name: "Program Download", tactics: ["TA0109"], platforms: ["None"], assets: ["A0003","A0018","A0017","A0010"], groups: [], software: ["S1009","S1006","S1045","S0603"], mitigations: ["M0813","M0947","M0937","M0807","M0930","M0800","M0945","M0802","M0801","M0804"], url: "https://attack.mitre.org/techniques/T0843" },
    { mitre_id: "T0845", name: "Program Upload", tactics: ["TA0100"], platforms: ["None"], assets: ["A0017","A0003","A0010","A0018"], groups: [], software: ["S1009","S1045"], mitigations: ["M0813","M0802","M0800","M0801","M0930","M0937","M0807","M0804"], url: "https://attack.mitre.org/techniques/T0845" },
    { mitre_id: "T0846", name: "Remote System Discovery", tactics: ["TA0102"], platforms: ["None"], assets: ["A0009","A0005","A0003","A0007","A0006","A0001","A0004","A0015","A0011","A0017","A0018","A0008","A0010","A0002","A0012","A0016"], groups: [], software: ["S0604","S1009","S0093","S1006","S1045"], mitigations: ["M0814"], url: "https://attack.mitre.org/techniques/T0846" },
    { mitre_id: "T0847", name: "Replication Through Removable Media", tactics: ["TA0108"], platforms: ["None"], assets: ["A0017","A0013","A0012","A0002","A0004","A0001","A0006","A0003","A0008","A0018","A0009","A0011","A0005","A0010","A0007"], groups: [], software: ["S0608","S0603"], mitigations: ["M0928","M0934","M0942"], url: "https://attack.mitre.org/techniques/T0847" },
    { mitre_id: "T0848", name: "Rogue Master", tactics: ["TA0108"], platforms: ["None"], assets: ["A0004","A0017","A0002","A0003","A0005","A0009","A0007","A0018","A0006","A0010"], groups: [], software: [], mitigations: ["M0813","M0937","M0930","M0807","M0802"], url: "https://attack.mitre.org/techniques/T0848" },
    { mitre_id: "T0849", name: "Masquerading", tactics: ["TA0103"], platforms: ["None"], assets: ["A0007","A0001","A0002","A0008","A0006","A0009","A0012"], groups: [], software: ["S0603","S1009","S0496","S0605"], mitigations: ["M0945","M0938","M0922"], url: "https://attack.mitre.org/techniques/T0849" },
    { mitre_id: "T0851", name: "Rootkit", tactics: ["TA0103","TA0107"], platforms: ["None"], assets: ["A0005","A0011","A0008","A0010","A0009","A0012","A0003","A0007","A0018","A0002","A0016","A0013","A0001","A0006","A0017","A0015"], groups: [], software: ["S0603"], mitigations: ["M0945","M0947"], url: "https://attack.mitre.org/techniques/T0851" },
    { mitre_id: "T0852", name: "Screen Capture", tactics: ["TA0100"], platforms: ["None"], assets: ["A0002","A0012","A0001"], groups: ["G0064","G1000"], software: [], mitigations: ["M0816"], url: "https://attack.mitre.org/techniques/T0852" },
    { mitre_id: "T0853", name: "Scripting", tactics: ["TA0104"], platforms: ["None"], assets: ["A0009","A0012","A0006","A0016","A0008","A0001","A0007","A0002","A0015"], groups: ["G0064","G0049"], software: ["S1009","S0496"], mitigations: ["M0938","M0948","M0942"], url: "https://attack.mitre.org/techniques/T0853" },
    { mitre_id: "T0855", name: "Unauthorized Command Message", tactics: ["TA0106"], platforms: ["None"], assets: ["A0003","A0010","A0018","A0004","A0007","A0002","A0017","A0005"], groups: [], software: ["S1045","S1072","S0604"], mitigations: ["M0818","M0930","M0937","M0802","M0807","M0813"], url: "https://attack.mitre.org/techniques/T0855" },
    { mitre_id: "T0856", name: "Spoof Reporting Message", tactics: ["TA0103","TA0106"], platforms: ["None"], assets: ["A0007","A0017","A0009","A0018","A0003","A0010","A0002","A0005","A0004"], groups: [], software: [], mitigations: ["M0813","M0802","M0930","M0807","M0937"], url: "https://attack.mitre.org/techniques/T0856" },
    { mitre_id: "T0857", name: "System Firmware", tactics: ["TA0110","TA0107"], platforms: ["None"], assets: ["A0015","A0011","A0002","A0016","A0003","A0017","A0004","A0010","A0009","A0005"], groups: [], software: ["S1009"], mitigations: ["M0947","M0804","M0802","M0945","M0807","M0808","M0801","M0946","M0930","M0951","M0813","M0941","M0937"], url: "https://attack.mitre.org/techniques/T0857" },
    { mitre_id: "T0858", name: "Change Operating Mode", tactics: ["TA0104","TA0103"], platforms: ["None"], assets: ["A0017","A0010","A0003","A0018"], groups: [], software: ["S1045","S1009","S1006"], mitigations: ["M0802","M0804","M0813","M0801","M0807","M0930","M0800"], url: "https://attack.mitre.org/techniques/T0858" },
    { mitre_id: "T0859", name: "Valid Accounts", tactics: ["TA0110","TA0109"], platforms: ["None"], assets: ["A0015","A0010","A0012","A0013","A0008","A0009","A0016","A0003","A0005","A0002","A0017","A0007","A0001","A0011","A0006","A0004","A0018"], groups: ["G1000","G0049"], software: ["S1045","S0089"], mitigations: ["M0801","M0926","M0918","M0937","M0932","M0927","M0913","M0947","M0936","M0915"], url: "https://attack.mitre.org/techniques/T0859" },
    { mitre_id: "T0860", name: "Wireless Compromise", tactics: ["TA0108"], platforms: ["None"], assets: ["A0013","A0001"], groups: [], software: [], mitigations: ["M0802","M0813","M0806","M0808"], url: "https://attack.mitre.org/techniques/T0860" },
    { mitre_id: "T0861", name: "Point & Tag Identification", tactics: ["TA0100"], platforms: ["None"], assets: ["A0004","A0017","A0009","A0010","A0007","A0002","A0005","A0006","A0018","A0003"], groups: [], software: ["S1045","S0093"], mitigations: ["M0800","M0807","M0937","M0804","M0813","M0801","M0930","M0802"], url: "https://attack.mitre.org/techniques/T0861" },
    { mitre_id: "T0862", name: "Supply Chain Compromise", tactics: ["TA0108"], platforms: ["None"], assets: ["A0006","A0004","A0009","A0007","A0012","A0016","A0008","A0018","A0003","A0011","A0015","A0001","A0017","A0002","A0010","A0005","A0013"], groups: ["G0088","G0035"], software: ["S0093"], mitigations: ["M0951","M0947","M0916","M0817","M0945"], url: "https://attack.mitre.org/techniques/T0862" },
    { mitre_id: "T0863", name: "User Execution", tactics: ["TA0104"], platforms: ["None"], assets: ["A0012","A0002","A0001"], groups: [], software: ["S0496","S0093","S0603","S0606"], mitigations: ["M0938","M0921","M0917","M0931","M0949","M0945"], url: "https://attack.mitre.org/techniques/T0863" },
    { mitre_id: "T0864", name: "Transient Cyber Asset", tactics: ["TA0108"], platforms: ["None"], assets: ["A0001"], groups: [], software: [], mitigations: ["M0941","M0947","M0949","M0930","M0951"], url: "https://attack.mitre.org/techniques/T0864" },
    { mitre_id: "T0865", name: "Spearphishing Attachment", tactics: ["TA0108"], platforms: ["None"], assets: ["A0001","A0012"], groups: ["G0064","G0032","G0049","G1000"], software: ["S0089","S0093"], mitigations: ["M0917","M0931","M0949","M0921"], url: "https://attack.mitre.org/techniques/T0865" },
    { mitre_id: "T0866", name: "Exploitation of Remote Services", tactics: ["TA0108","TA0109"], platforms: ["None"], assets: ["A0018","A0002","A0017","A0015","A0014","A0005","A0004","A0010","A0016","A0006","A0009","A0012","A0007","A0003","A0008","A0011","A0001"], groups: [], software: ["S0606","S0368","S0603","S0366"], mitigations: ["M0916","M0942","M0950","M0919","M0930","M0948","M0926","M0951"], url: "https://attack.mitre.org/techniques/T0866" },
    { mitre_id: "T0867", name: "Lateral Tool Transfer", tactics: ["TA0109"], platforms: ["None"], assets: ["A0008","A0011","A0007","A0013","A0012","A0001"], groups: [], software: ["S0603","S0368","S1045","S0366","S0606"], mitigations: ["M0931"], url: "https://attack.mitre.org/techniques/T0867" },
    { mitre_id: "T0868", name: "Detect Operating Mode", tactics: ["TA0100"], platforms: ["None"], assets: ["A0003","A0010","A0018","A0017"], groups: [], software: ["S1009"], mitigations: ["M0813","M0804","M0937","M0801","M0802","M0807","M0800","M0930"], url: "https://attack.mitre.org/techniques/T0868" },
    { mitre_id: "T0869", name: "Standard Application Layer Protocol", tactics: ["TA0101"], platforms: ["None"], assets: ["A0005","A0003","A0012","A0007","A0009","A0008","A0001","A0018","A0017","A0015","A0002","A0010","A0006","A0016","A0004","A0011"], groups: ["G0049"], software: ["S1045","S0089","S1165","S0603","S0496","S1009"], mitigations: ["M0930","M0931","M0807"], url: "https://attack.mitre.org/techniques/T0869" },
    { mitre_id: "T0871", name: "Execution through API", tactics: ["TA0104"], platforms: ["None"], assets: ["A0016","A0005","A0017","A0018","A0010","A0003","A0015","A0004","A0002","A0013","A0009","A0001"], groups: [], software: ["S1009"], mitigations: ["M0938","M0800","M0804","M0801"], url: "https://attack.mitre.org/techniques/T0871" },
    { mitre_id: "T0872", name: "Indicator Removal on Host", tactics: ["TA0103"], platforms: ["None"], assets: ["A0008","A0016","A0006","A0007","A0005","A0004","A0001","A0002","A0003","A0009","A0018","A0015","A0010","A0012","A0017","A0011"], groups: [], software: ["S1009","S0607"], mitigations: ["M0922"], url: "https://attack.mitre.org/techniques/T0872" },
    { mitre_id: "T0873", name: "Project File Infection", tactics: ["TA0110"], platforms: ["None"], assets: ["A0001"], groups: [], software: ["S0603"], mitigations: ["M0922","M0941","M0947","M0945"], url: "https://attack.mitre.org/techniques/T0873" },
    { mitre_id: "T0874", name: "Hooking", tactics: ["TA0104","TA0111"], platforms: ["None"], assets: ["A0012","A0003","A0002","A0009","A0015","A0007","A0006","A0005","A0001","A0010","A0008","A0004","A0014","A0017","A0018","A0011","A0016"], groups: [], software: ["S0603","S1009"], mitigations: ["M0944","M0947"], url: "https://attack.mitre.org/techniques/T0874" },
    { mitre_id: "T0877", name: "I/O Image", tactics: ["TA0100"], platforms: ["None"], assets: ["A0018","A0010","A0017","A0003"], groups: [], software: ["S0603"], mitigations: ["M0816"], url: "https://attack.mitre.org/techniques/T0877" },
    { mitre_id: "T0878", name: "Alarm Suppression", tactics: ["TA0107"], platforms: ["None"], assets: ["A0018","A0002","A0009","A0017","A0007","A0005","A0010","A0004","A0006","A0003"], groups: [], software: [], mitigations: ["M0814","M0807","M0930","M0810"], url: "https://attack.mitre.org/techniques/T0878" },
    { mitre_id: "T0879", name: "Damage to Property", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: [], mitigations: ["M0807","M0812","M0805"], url: "https://attack.mitre.org/techniques/T0879" },
    { mitre_id: "T0880", name: "Loss of Safety", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S1009"], mitigations: ["M0812","M0805"], url: "https://attack.mitre.org/techniques/T0880" },
    { mitre_id: "T0881", name: "Service Stop", tactics: ["TA0107"], platforms: ["None"], assets: ["A0008","A0005","A0015","A0002","A0016","A0004","A0006","A0011","A0001","A0007","A0012","A0010","A0009"], groups: [], software: ["S0605","S0496","S1072","S0604","S0607"], mitigations: ["M0918","M0924","M0922","M0930"], url: "https://attack.mitre.org/techniques/T0881" },
    { mitre_id: "T0882", name: "Theft of Operational Information", tactics: ["TA0105"], platforms: ["None"], assets: [], groups: [], software: ["S1000","S0496","S0038","S0143"], mitigations: ["M0922","M0809","M0803","M0941"], url: "https://attack.mitre.org/techniques/T0882" },
    { mitre_id: "T0883", name: "Internet Accessible Device", tactics: ["TA0108"], platforms: ["None"], assets: ["A0016","A0011","A0015","A0008","A0001"], groups: [], software: ["S1157"], mitigations: ["M0930"], url: "https://attack.mitre.org/techniques/T0883" },
    { mitre_id: "T0884", name: "Connection Proxy", tactics: ["TA0101"], platforms: ["None"], assets: ["A0004","A0010","A0017","A0014","A0012","A0015","A0002","A0013","A0018","A0008","A0001","A0016","A0007","A0006","A0003","A0011","A0005","A0009"], groups: ["G0034"], software: ["S1045","S0604"], mitigations: ["M0920","M0931","M0937","M0807"], url: "https://attack.mitre.org/techniques/T0884" },
    { mitre_id: "T0885", name: "Commonly Used Port", tactics: ["TA0101"], platforms: ["None"], assets: ["A0014","A0013","A0006","A0011","A0003","A0005","A0017","A0016","A0010","A0001","A0012","A0009","A0002","A0018","A0004","A0015","A0008","A0007"], groups: [], software: ["S1165","S1009","S0603"], mitigations: ["M0804","M0931","M0930","M0942"], url: "https://attack.mitre.org/techniques/T0885" },
    { mitre_id: "T0886", name: "Remote Services", tactics: ["TA0108","TA0109"], platforms: ["None"], assets: ["A0007","A0015","A0017","A0008","A0002","A0011","A0006","A0012","A0009"], groups: [], software: ["S1045","S0496","S0603"], mitigations: ["M0813","M0800","M0930","M0927","M0804","M0807","M0918","M0801","M0937"], url: "https://attack.mitre.org/techniques/T0886" },
    { mitre_id: "T0887", name: "Wireless Sniffing", tactics: ["TA0102","TA0100"], platforms: ["None"], assets: ["A0013","A0001"], groups: [], software: [], mitigations: ["M0806","M0808"], url: "https://attack.mitre.org/techniques/T0887" },
    { mitre_id: "T0888", name: "Remote System Information Discovery", tactics: ["TA0102"], platforms: ["None"], assets: ["A0004","A0005","A0012","A0003","A0002","A0008","A0015","A0009","A0001","A0017","A0007","A0013","A0011","A0010","A0018","A0006","A0016"], groups: [], software: ["S0093","S0603","S0604","S1072","S1045"], mitigations: ["M0814"], url: "https://attack.mitre.org/techniques/T0888" },
    { mitre_id: "T0889", name: "Modify Program", tactics: ["TA0110"], platforms: ["None"], assets: ["A0017","A0010","A0018","A0003"], groups: [], software: ["S1006","S0603"], mitigations: ["M0947","M0945","M0800","M0804"], url: "https://attack.mitre.org/techniques/T0889" },
    { mitre_id: "T0890", name: "Exploitation for Privilege Escalation", tactics: ["TA0111"], platforms: ["None"], assets: ["A0003","A0010","A0007","A0005","A0012","A0011","A0018","A0015","A0016","A0002","A0009","A0008","A0017","A0014","A0001","A0006"], groups: [], software: ["S1009","S1045"], mitigations: ["M0950","M0948","M0951","M0919"], url: "https://attack.mitre.org/techniques/T0890" },
    { mitre_id: "T0891", name: "Hardcoded Credentials", tactics: ["TA0109","TA0110"], platforms: ["None"], assets: ["A0013"], groups: [], software: ["S1045","S0603"], mitigations: ["M0801"], url: "https://attack.mitre.org/techniques/T0891" },
    { mitre_id: "T0892", name: "Change Credential", tactics: ["TA0107"], platforms: ["None"], assets: ["A0012","A0011","A0008","A0007","A0006","A0009","A0016","A0004","A0003","A0015","A0001","A0002","A0010","A0005","A0018","A0014","A0017"], groups: [], software: [], mitigations: ["M0927","M0953","M0811"], url: "https://attack.mitre.org/techniques/T0892" },
    { mitre_id: "T0893", name: "Data from Local System", tactics: ["TA0100"], platforms: ["None"], assets: ["A0016","A0007","A0015","A0006","A0002","A0008","A0001","A0012"], groups: [], software: ["S0038","S0143","S1000"], mitigations: ["M0941","M0803","M0922","M0917"], url: "https://attack.mitre.org/techniques/T0893" },
    { mitre_id: "T0894", name: "System Binary Proxy Execution", tactics: ["TA0103"], platforms: ["None"], assets: ["A0012","A0007","A0008","A0001","A0002","A0006"], groups: [], software: [], mitigations: ["M0938"], url: "https://attack.mitre.org/techniques/T0894" },
    { mitre_id: "T0895", name: "Autorun Image", tactics: ["TA0104"], platforms: [], assets: ["A0008","A0001","A0006","A0012","A0002","A0007"], groups: [], software: [], mitigations: ["M0928"], url: "https://attack.mitre.org/techniques/T0895" }
  ],
  groups: [
    { id: "G0032", name: "Lazarus Group", aliases: ["Lazarus Group","Labyrinth Chollima","HIDDEN COBRA","Guardians of Peace","ZINC","NICKEL ACADEMY","Diamond Sleet"], description: "North Korean state-sponsored cyber threat group attributed to the Reconnaissance General Bureau (RGB). Active since at least 2009.", techniques: ["T0865"], software: ["S0366"], url: "https://attack.mitre.org/groups/G0032" },
    { id: "G0034", name: "Sandworm Team", aliases: ["Sandworm Team","ELECTRUM","Telebots","IRON VIKING","BlackEnergy (Group)","Quedagh","Voodoo Bear","IRIDIUM","Seashell Blizzard","FROZENBARENTS","APT44"], description: "Destructive threat group attributed to Russia's GRU military unit 74455. Active since at least 2009.", techniques: ["T0807","T0819","T0884"], software: ["S0606","S1010","S0604","S1072","S0089","S0368","S0607"], url: "https://attack.mitre.org/groups/G0034" },
    { id: "G0035", name: "Dragonfly", aliases: ["Dragonfly","TEMP.Isotope","DYMALLOY","Berserk Bear","TG-4192","Crouching Yeti","IRON LIBERTY","Energetic Bear","Ghost Blizzard","BROMINE"], description: "Cyber espionage group attributed to Russia's FSB Center 16. Active since at least 2010.", techniques: ["T0817","T0862"], software: ["S0093"], url: "https://attack.mitre.org/groups/G0035" },
    { id: "G0037", name: "FIN6", aliases: ["FIN6","Magecart Group 6","ITG08","Skeleton Spider","TAAL","Camouflage Tempest"], description: "Cyber crime group that has stolen payment card data and sold it for profit on underground marketplaces.", techniques: [], software: ["S0372","S0446"], url: "https://attack.mitre.org/groups/G0037" },
    { id: "G0046", name: "FIN7", aliases: ["FIN7","GOLD NIAGARA","ITG14","Carbon Spider","ELBRUS","Sangria Tempest"], description: "Financially-motivated threat group active since 2013. Shifted to big game hunting including REvil ransomware.", techniques: [], software: ["S0496"], url: "https://attack.mitre.org/groups/G0046" },
    { id: "G0049", name: "OilRig", aliases: ["OilRig","COBALT GYPSY","IRN2","APT34","Helix Kitten","Evasive Serpens","Hazel Sandstorm","EUROPIUM","ITG13","Earth Simnavaz","Crambus","TA452"], description: "Suspected Iranian threat group targeting Middle Eastern and international victims since at least 2014.", techniques: ["T0865","T0853","T0869","T0859","T0817"], software: [], url: "https://attack.mitre.org/groups/G0049" },
    { id: "G0064", name: "APT33", aliases: ["APT33","HOLMIUM","Elfin","Peach Sandstorm"], description: "Suspected Iranian threat group active since at least 2013, targeting aviation and energy sectors.", techniques: ["T0852","T0865","T0853"], software: [], url: "https://attack.mitre.org/groups/G0064" },
    { id: "G0082", name: "APT38", aliases: ["APT38","NICKEL GLADSTONE","BeagleBoyz","Bluenoroff","Stardust Chollima","Sapphire Sleet","COPERNICIUM"], description: "North Korean state-sponsored group specializing in financial cyber operations. Active since at least 2014.", techniques: [], software: ["S0607"], url: "https://attack.mitre.org/groups/G0082" },
    { id: "G0088", name: "TEMP.Veles", aliases: ["TEMP.Veles","XENOTIME"], description: "Russia-based threat group that has targeted critical infrastructure using the TRITON malware framework.", techniques: ["T0862","T0817"], software: ["S1009"], url: "https://attack.mitre.org/groups/G0088" },
    { id: "G0102", name: "Wizard Spider", aliases: ["Wizard Spider","UNC1878","TEMP.MixMaster","Grim Spider","FIN12","GOLD BLACKBURN","ITG23","Periwinkle Tempest","DEV-0193"], description: "Russia-based financially motivated threat group known for TrickBot and ransomware campaigns.", techniques: [], software: ["S0446"], url: "https://attack.mitre.org/groups/G0102" },
    { id: "G0115", name: "GOLD SOUTHFIELD", aliases: ["GOLD SOUTHFIELD","Pinchy Spider"], description: "Financially motivated threat group operating the REvil Ransomware-as-a-Service (RaaS) since at least 2018.", techniques: [], software: ["S0496"], url: "https://attack.mitre.org/groups/G0115" },
    { id: "G1000", name: "ALLANITE", aliases: ["ALLANITE","Palmetto Fusion"], description: "Suspected Russian cyber espionage group targeting the electric utility sector in the US and UK.", techniques: ["T0859","T0852","T0865","T0817"], software: [], url: "https://attack.mitre.org/groups/G1000" },
    { id: "G1001", name: "HEXANE", aliases: ["HEXANE","Lyceum","Siamesekitten","Spirlin"], description: "Cyber espionage group targeting oil & gas, telecom, and aviation since at least 2017.", techniques: [], software: [], url: "https://attack.mitre.org/groups/G1001" },
    { id: "G1027", name: "CyberAv3ngers", aliases: ["CyberAv3ngers","Soldiers of Soloman"], description: "Suspected Iranian IRGC-affiliated APT group active since at least 2020, targeting critical infrastructure.", techniques: [], software: [], url: "https://attack.mitre.org/groups/G1027" }
  ],
  software: [
    { id: "S0038", name: "Duqu", type: "Malware", platforms: ["Windows"], techniques: ["T0893","T0811","T0882"], url: "https://attack.mitre.org/software/S0038" },
    { id: "S0089", name: "BlackEnergy", type: "Malware", platforms: ["Windows"], techniques: ["T0869","T0865","T0859"], url: "https://attack.mitre.org/software/S0089" },
    { id: "S0093", name: "Backdoor.Oldrea", type: "Malware", platforms: ["Windows"], techniques: ["T0888","T0846","T0863","T0862","T0802","T0861","T0814","T0865"], url: "https://attack.mitre.org/software/S0093" },
    { id: "S0143", name: "Flame", type: "Malware", platforms: ["Windows"], techniques: ["T0893","T0882"], url: "https://attack.mitre.org/software/S0143" },
    { id: "S0366", name: "WannaCry", type: "Malware", platforms: ["Windows"], techniques: ["T0866","T0867"], url: "https://attack.mitre.org/software/S0366" },
    { id: "S0368", name: "NotPetya", type: "Malware", platforms: ["Windows"], techniques: ["T0867","T0866","T0828"], url: "https://attack.mitre.org/software/S0368" },
    { id: "S0372", name: "LockerGoga", type: "Malware", platforms: ["Windows"], techniques: ["T0828","T0829","T0827"], url: "https://attack.mitre.org/software/S0372" },
    { id: "S0446", name: "Ryuk", type: "Malware", platforms: ["Windows"], techniques: ["T0828"], url: "https://attack.mitre.org/software/S0446" },
    { id: "S0496", name: "REvil", type: "Malware", platforms: ["Windows"], techniques: ["T0863","T0881","T0849","T0882","T0828","T0869","T0886","T0853"], url: "https://attack.mitre.org/software/S0496" },
    { id: "S0603", name: "Stuxnet", type: "Malware", platforms: ["Windows"], techniques: ["T0849","T0888","T0877","T0801","T0867","T0834","T0836","T0874","T0807","T0843","T0847","T0891","T0863","T0869","T0885","T0866","T0831","T0889","T0821","T0873","T0832","T0886","T0835","T0851","T0842"], url: "https://attack.mitre.org/software/S0603" },
    { id: "S0604", name: "Industroyer", type: "Malware", platforms: ["Windows"], techniques: ["T0846","T0807","T0884","T0814","T0888","T0804","T0881","T0831","T0801","T0800","T0840","T0816","T0805","T0806","T0813","T0829","T0855","T0815","T0809","T0827","T0802","T0803","T0832","T0837"], url: "https://attack.mitre.org/software/S0604" },
    { id: "S0605", name: "EKANS", type: "Malware", platforms: ["Windows"], techniques: ["T0881","T0840","T0828","T0849"], url: "https://attack.mitre.org/software/S0605" },
    { id: "S0606", name: "Bad Rabbit", type: "Malware", platforms: ["Windows"], techniques: ["T0866","T0817","T0828","T0863","T0867"], url: "https://attack.mitre.org/software/S0606" },
    { id: "S0607", name: "KillDisk", type: "Malware", platforms: ["Linux","Windows"], techniques: ["T0829","T0872","T0809","T0881"], url: "https://attack.mitre.org/software/S0607" },
    { id: "S0608", name: "Conficker", type: "Malware", platforms: ["Windows"], techniques: ["T0828","T0847","T0826"], url: "https://attack.mitre.org/software/S0608" },
    { id: "S1000", name: "ACAD/Medre.A", type: "Malware", platforms: [], techniques: ["T0882","T0893"], url: "https://attack.mitre.org/software/S1000" },
    { id: "S1006", name: "PLC-Blaster", type: "Malware", platforms: [], techniques: ["T0821","T0834","T0843","T0814","T0846","T0835","T0889","T0858"], url: "https://attack.mitre.org/software/S1006" },
    { id: "S1009", name: "Triton", type: "Malware", platforms: [], techniques: ["T0834","T0843","T0849","T0846","T0872","T0890","T0821","T0853","T0858","T0885","T0857","T0868","T0845","T0874","T0871","T0880","T0820","T0869"], url: "https://attack.mitre.org/software/S1009" },
    { id: "S1010", name: "VPNFilter", type: "Malware", platforms: ["Network Devices","Linux"], techniques: ["T0830","T0842"], url: "https://attack.mitre.org/software/S1010" },
    { id: "S1045", name: "INCONTROLLER", type: "Malware", platforms: ["Field Controller/RTU/PLC/IED","Safety Instrumented System/Protection Relay","Engineering Workstation","Windows"], techniques: ["T0861","T0869","T0855","T0891","T0886","T0884","T0836","T0858","T0859","T0846","T0843","T0888","T0867","T0845","T0890","T0842","T0809"], url: "https://attack.mitre.org/software/S1045" },
    { id: "S1072", name: "Industroyer2", type: "Malware", platforms: ["Field Controller/RTU/PLC/IED","Engineering Workstation"], techniques: ["T0806","T0881","T0836","T0888","T0855","T0802","T0801"], url: "https://attack.mitre.org/software/S1072" },
    { id: "S1157", name: "Fuxnet", type: "Malware", platforms: ["Input/Output Server","Control Server"], techniques: ["T0883","T0822","T0806","T0829","T0814","T0809"], url: "https://attack.mitre.org/software/S1157" },
    { id: "S1165", name: "FrostyGoop", type: "Malware", platforms: ["Control Server","Field Controller/RTU/PLC/IED"], techniques: ["T0836","T0801","T0869","T0885","T0807"], url: "https://attack.mitre.org/software/S1165" }
  ],
  mitigations: [
    { id: "M0800", name: "Authorization Enforcement", techniques: ["T0861","T0821","T0886","T0845","T0838","T0816","T0871","T0843","T0868","T0889","T0836","T0858","T0800"], url: "https://attack.mitre.org/mitigations/M0800" },
    { id: "M0801", name: "Access Management", techniques: ["T0859","T0812","T0891","T0845","T0868","T0857","T0858","T0800","T0861","T0886","T0839","T0816","T0843","T0871","T0838"], url: "https://attack.mitre.org/mitigations/M0801" },
    { id: "M0802", name: "Communication Authenticity", techniques: ["T0845","T0858","T0856","T0857","T0860","T0832","T0816","T0855","T0839","T0848","T0868","T0800","T0831","T0861","T0843","T0830"], url: "https://attack.mitre.org/mitigations/M0802" },
    { id: "M0803", name: "Data Loss Prevention", techniques: ["T0893","T0882"], url: "https://attack.mitre.org/mitigations/M0803" },
    { id: "M0804", name: "Human User Authentication", techniques: ["T0838","T0885","T0857","T0858","T0816","T0868","T0821","T0800","T0886","T0861","T0839","T0836","T0871","T0845","T0843","T0889"], url: "https://attack.mitre.org/mitigations/M0804" },
    { id: "M0805", name: "Mechanical Protection Layers", techniques: ["T0880","T0879"], url: "https://attack.mitre.org/mitigations/M0805" },
    { id: "M0806", name: "Minimize Wireless Signal Propagation", techniques: ["T0887","T0860"], url: "https://attack.mitre.org/mitigations/M0806" },
    { id: "M0807", name: "Network Allowlists", techniques: ["T0816","T0800","T0838","T0861","T0857","T0843","T0806","T0879","T0848","T0802","T0804","T0886","T0868","T0858","T0878","T0855","T0845","T0803","T0884","T0805","T0856","T0869","T0839"], url: "https://attack.mitre.org/mitigations/M0807" },
    { id: "M0808", name: "Encrypt Network Traffic", techniques: ["T0887","T0839","T0857","T0860","T0842"], url: "https://attack.mitre.org/mitigations/M0808" },
    { id: "M0809", name: "Operational Information Confidentiality", techniques: ["T0882"], url: "https://attack.mitre.org/mitigations/M0809" },
    { id: "M0810", name: "Out-of-Band Communications Channel", techniques: ["T0803","T0815","T0813","T0804","T0831","T0830","T0826","T0832","T0805","T0827","T0878","T0829"], url: "https://attack.mitre.org/mitigations/M0810" },
    { id: "M0811", name: "Redundancy of Service", techniques: ["T0827","T0829","T0813","T0826","T0892","T0815"], url: "https://attack.mitre.org/mitigations/M0811" },
    { id: "M0812", name: "Safety Instrumented Systems", techniques: ["T0880","T0879"], url: "https://attack.mitre.org/mitigations/M0812" },
    { id: "M0813", name: "Software Process and Device Authentication", techniques: ["T0843","T0845","T0856","T0848","T0868","T0839","T0860","T0886","T0838","T0830","T0800","T0858","T0861","T0855","T0857","T0806","T0816"], url: "https://attack.mitre.org/mitigations/M0813" },
    { id: "M0814", name: "Static Network Configuration", techniques: ["T0804","T0878","T0888","T0830","T0846","T0842","T0803"], url: "https://attack.mitre.org/mitigations/M0814" },
    { id: "M0815", name: "Watchdog Timers", techniques: ["T0814"], url: "https://attack.mitre.org/mitigations/M0815" },
    { id: "M0816", name: "Mitigation Limited or Not Effective", techniques: ["T0877","T0823","T0801","T0840","T0835","T0852"], url: "https://attack.mitre.org/mitigations/M0816" },
    { id: "M0817", name: "Supply Chain Management", techniques: ["T0862"], url: "https://attack.mitre.org/mitigations/M0817" },
    { id: "M0818", name: "Validate Program Inputs", techniques: ["T0855","T0836"], url: "https://attack.mitre.org/mitigations/M0818" },
    { id: "M0913", name: "Application Developer Guidance", techniques: ["T0859"], url: "https://attack.mitre.org/mitigations/M0913" },
    { id: "M0915", name: "Active Directory Configuration", techniques: ["T0859"], url: "https://attack.mitre.org/mitigations/M0915" },
    { id: "M0916", name: "Vulnerability Scanning", techniques: ["T0866","T0819","T0862"], url: "https://attack.mitre.org/mitigations/M0916" },
    { id: "M0917", name: "User Training", techniques: ["T0863","T0865","T0893","T0811"], url: "https://attack.mitre.org/mitigations/M0917" },
    { id: "M0918", name: "User Account Management", techniques: ["T0881","T0859","T0838","T0822","T0886","T0811"], url: "https://attack.mitre.org/mitigations/M0918" },
    { id: "M0919", name: "Threat Intelligence Program", techniques: ["T0820","T0866","T0890"], url: "https://attack.mitre.org/mitigations/M0919" },
    { id: "M0920", name: "SSL/TLS Inspection", techniques: ["T0884"], url: "https://attack.mitre.org/mitigations/M0920" },
    { id: "M0921", name: "Restrict Web-Based Content", techniques: ["T0863","T0865","T0817"], url: "https://attack.mitre.org/mitigations/M0921" },
    { id: "M0922", name: "Restrict File and Directory Permissions", techniques: ["T0809","T0882","T0873","T0881","T0811","T0872","T0893","T0849"], url: "https://attack.mitre.org/mitigations/M0922" },
    { id: "M0924", name: "Restrict Registry Permissions", techniques: ["T0881"], url: "https://attack.mitre.org/mitigations/M0924" },
    { id: "M0926", name: "Privileged Account Management", techniques: ["T0859","T0842","T0866","T0811","T0819","T0809"], url: "https://attack.mitre.org/mitigations/M0926" },
    { id: "M0927", name: "Password Policies", techniques: ["T0812","T0886","T0892","T0822","T0859"], url: "https://attack.mitre.org/mitigations/M0927" },
    { id: "M0928", name: "Operating System Configuration", techniques: ["T0847","T0895"], url: "https://attack.mitre.org/mitigations/M0928" },
    { id: "M0930", name: "Network Segmentation", techniques: ["T0869","T0838","T0855","T0822","T0883","T0842","T0830","T0816","T0886","T0805","T0856","T0806","T0848","T0866","T0845","T0864","T0839","T0843","T0881","T0802","T0857","T0878","T0885","T0861","T0858","T0868","T0800","T0819"], url: "https://attack.mitre.org/mitigations/M0930" },
    { id: "M0931", name: "Network Intrusion Prevention", techniques: ["T0869","T0884","T0885","T0865","T0830","T0863","T0867"], url: "https://attack.mitre.org/mitigations/M0931" },
    { id: "M0932", name: "Multi-factor Authentication", techniques: ["T0842","T0859","T0822"], url: "https://attack.mitre.org/mitigations/M0932" },
    { id: "M0934", name: "Limit Hardware Installation", techniques: ["T0847"], url: "https://attack.mitre.org/mitigations/M0934" },
    { id: "M0935", name: "Limit Access to Resource Over Network", techniques: ["T0822"], url: "https://attack.mitre.org/mitigations/M0935" },
    { id: "M0936", name: "Account Use Policies", techniques: ["T0822","T0859"], url: "https://attack.mitre.org/mitigations/M0936" },
    { id: "M0937", name: "Filter Network Traffic", techniques: ["T0843","T0839","T0855","T0848","T0859","T0868","T0861","T0884","T0806","T0845","T0816","T0856","T0857","T0800","T0886"], url: "https://attack.mitre.org/mitigations/M0937" },
    { id: "M0938", name: "Execution Prevention", techniques: ["T0863","T0853","T0894","T0871","T0834","T0807","T0849"], url: "https://attack.mitre.org/mitigations/M0938" },
    { id: "M0941", name: "Encrypt Sensitive Information", techniques: ["T0893","T0839","T0864","T0811","T0873","T0882","T0857"], url: "https://attack.mitre.org/mitigations/M0941" },
    { id: "M0942", name: "Disable or Remove Feature or Program", techniques: ["T0866","T0853","T0807","T0816","T0822","T0885","T0830","T0847"], url: "https://attack.mitre.org/mitigations/M0942" },
    { id: "M0944", name: "Restrict Library Loading", techniques: ["T0874"], url: "https://attack.mitre.org/mitigations/M0944" },
    { id: "M0945", name: "Code Signing", techniques: ["T0851","T0857","T0839","T0821","T0889","T0849","T0843","T0862","T0863","T0873"], url: "https://attack.mitre.org/mitigations/M0945" },
    { id: "M0946", name: "Boot Integrity", techniques: ["T0839","T0857"], url: "https://attack.mitre.org/mitigations/M0946" },
    { id: "M0947", name: "Audit", techniques: ["T0862","T0857","T0843","T0811","T0889","T0864","T0836","T0851","T0839","T0821","T0830","T0874","T0859","T0873"], url: "https://attack.mitre.org/mitigations/M0947" },
    { id: "M0948", name: "Application Isolation and Sandboxing", techniques: ["T0853","T0890","T0820","T0866","T0817","T0819"], url: "https://attack.mitre.org/mitigations/M0948" },
    { id: "M0949", name: "Antivirus/Antimalware", techniques: ["T0864","T0865","T0863"], url: "https://attack.mitre.org/mitigations/M0949" },
    { id: "M0950", name: "Exploit Protection", techniques: ["T0820","T0890","T0866","T0819","T0817"], url: "https://attack.mitre.org/mitigations/M0950" },
    { id: "M0951", name: "Update Software", techniques: ["T0862","T0817","T0819","T0890","T0820","T0857","T0864","T0866"], url: "https://attack.mitre.org/mitigations/M0951" },
    { id: "M0953", name: "Data Backup", techniques: ["T0813","T0831","T0827","T0809","T0892","T0826","T0815","T0832","T0828","T0829"], url: "https://attack.mitre.org/mitigations/M0953" },
    { id: "M0954", name: "Software Configuration", techniques: [], url: "https://attack.mitre.org/mitigations/M0954" }
  ],
  assets: [
    { id: "A0001", name: "Workstation", description: "Devices used by human operators or engineers to perform configuration, programming, maintenance, diagnostic, or operational tasks.", sectors: ["General"], relatedAssets: ["Transient Cyber Asset (TCA)","Engineering Workstation (EWS)"], url: "https://attack.mitre.org/assets/A0001" },
    { id: "A0002", name: "Human-Machine Interface (HMI)", description: "Systems used by an operator to monitor the real-time status of an operational process and to perform necessary control functions.", sectors: ["General"], relatedAssets: ["Operator Workstation (OWS)"], url: "https://attack.mitre.org/assets/A0002" },
    { id: "A0003", name: "Programmable Logic Controller (PLC)", description: "An embedded programmable control device utilizing a modular architecture for processing, communication, and I/O interfaces.", sectors: ["General"], relatedAssets: ["Process Automation Controller (PAC)","Field Device / Controller"], url: "https://attack.mitre.org/assets/A0003" },
    { id: "A0004", name: "Remote Terminal Unit (RTU)", description: "A device that typically resides between field devices and control/SCADA servers, supporting communication interfacing and data aggregation.", sectors: ["Electric","Water and Wastewater","General"], relatedAssets: [], url: "https://attack.mitre.org/assets/A0004" },
    { id: "A0005", name: "Intelligent Electronic Device (IED)", description: "A specialized field device designed for protection, monitoring, or control within the electric sector.", sectors: ["Electric"], relatedAssets: ["Protection Relay","Field Device / Controller"], url: "https://attack.mitre.org/assets/A0005" },
    { id: "A0006", name: "Data Historian", description: "Systems used to collect and store telemetry, events, alerts, and alarms about the operational process.", sectors: ["General"], relatedAssets: [], url: "https://attack.mitre.org/assets/A0006" },
    { id: "A0007", name: "Control Server", description: "Software platform on a server OS that communicates with low-level control devices such as RTUs and PLCs using automation protocols.", sectors: ["General"], relatedAssets: ["SCADA Server","Master Terminal Unit (MTU)","DMS/EMS","BMS/BAS","MES"], url: "https://attack.mitre.org/assets/A0007" },
    { id: "A0008", name: "Application Server", description: "Servers hosting diverse software applications supporting the ICS, such as data analytics, alarm management, and control coordination.", sectors: ["General"], relatedAssets: ["File Server","License Server","Update/Patch Server","Domain Controller","Database Server"], url: "https://attack.mitre.org/assets/A0008" },
    { id: "A0009", name: "Data Gateway", description: "A device supporting communication and exchange of data between systems, networks, or protocols within the ICS.", sectors: ["General"], relatedAssets: ["Data Acquisition Server (DAS)","Serial to Ethernet Gateway","Industrial Edge"], url: "https://attack.mitre.org/assets/A0009" },
    { id: "A0010", name: "Safety Controller", description: "Field device used to perform safety critical functions, often with redundant hardware and processors.", sectors: [], relatedAssets: ["SIS Controller","ESD Controller","BMS Controller"], url: "https://attack.mitre.org/assets/A0010" },
    { id: "A0011", name: "Virtual Private Network (VPN) Server", description: "A device used to establish secure network tunnels between itself and remote VPN devices.", sectors: ["General"], relatedAssets: ["VPN Terminator","Field VPN"], url: "https://attack.mitre.org/assets/A0011" },
    { id: "A0012", name: "Jump Host", description: "Device used to support remote management sessions into ICS networks, providing secure access from external networks.", sectors: ["General"], relatedAssets: ["Intermediate System"], url: "https://attack.mitre.org/assets/A0012" },
    { id: "A0013", name: "Field I/O", description: "Devices that communicate with a controller or data aggregator to send input data or receive output data.", sectors: [], relatedAssets: ["Smart Sensors","Variable Frequency Drive (VFD)"], url: "https://attack.mitre.org/assets/A0013" },
    { id: "A0014", name: "Routers", description: "A computer that is a gateway between two networks at OSI layer 3, relaying and directing data packets.", sectors: ["General"], relatedAssets: [], url: "https://attack.mitre.org/assets/A0014" },
    { id: "A0015", name: "Switch", description: "A network device connecting endpoints so they can communicate and share data, operating at Layer 2 or 3.", sectors: ["General"], relatedAssets: ["Core Switch","Access Switch","Layer 2/3 Switch","Distribution Switch"], url: "https://attack.mitre.org/assets/A0015" },
    { id: "A0016", name: "Firewall", description: "A gateway that limits access between networks in accordance with local security policy.", sectors: ["General"], relatedAssets: ["Boundary Firewall","Device Firewall"], url: "https://attack.mitre.org/assets/A0016" },
    { id: "A0017", name: "Distributed Control System (DCS) Controller", description: "A microprocessor unit managing automation processes, often as part of a larger networked DCS system.", sectors: ["General"], relatedAssets: ["Field Device / Controller","Programmable Logic Controller (PLC)"], url: "https://attack.mitre.org/assets/A0017" },
    { id: "A0018", name: "Programmable Automation Controller (PAC)", description: "An embedded programmable control device with advanced features for process, motion, drive, and vision control.", sectors: [], relatedAssets: ["Field Device / Controller","Programmable Logic Controller (PLC)"], url: "https://attack.mitre.org/assets/A0018" }
  ],
  campaigns: [
    { id: "C0020", name: "Maroochy Water Breach", description: "An incident in 2000 where an adversary leveraged the local government's wastewater control system to release 800,000 liters of raw sewage.", firstSeen: "2000-02-01", lastSeen: "2000-04-01", techniques: ["T0822","T0838","T0864","T0879","T0836","T0856","T0813","T0860","T0848","T0878","T0855","T0815"], groups: [], url: "https://attack.mitre.org/campaigns/C0020" },
    { id: "C0025", name: "2016 Ukraine Electric Power Attack", description: "Sandworm Team campaign using Industroyer malware to disrupt Ukrainian distribution substations.", firstSeen: "2016-12-01", lastSeen: "2016-12-01", techniques: ["T0867","T0886","T0853","T0859","T0807","T0849"], groups: ["G0034"], url: "https://attack.mitre.org/campaigns/C0025" },
    { id: "C0028", name: "2015 Ukraine Electric Power Attack", description: "Sandworm Team campaign using BlackEnergy and KillDisk to disrupt Ukrainian transmission and distribution substations.", firstSeen: "2015-12-01", lastSeen: "2016-01-01", techniques: ["T0822","T0884","T0857","T0859","T0886","T0805","T0828","T0831","T0803","T0885","T0814","T0867","T0816","T0823","T0813","T0804","T0846","T0855","T0827","T0826"], groups: ["G0034"], url: "https://attack.mitre.org/campaigns/C0028" },
    { id: "C0030", name: "Triton Safety Instrumented System Attack", description: "TEMP.Veles campaign leveraging Triton malware against a petrochemical organization's safety controllers.", firstSeen: "2017-06-01", lastSeen: "2017-08-01", techniques: ["T0830","T0807","T0853","T0828","T0843","T0872","T0859","T0867","T0886","T0855"], groups: ["G0088"], url: "https://attack.mitre.org/campaigns/C0030" },
    { id: "C0031", name: "Unitronics Defacement Campaign", description: "CyberAv3ngers global targeting and defacement of Unitronics Vision Series PLCs across multiple sectors.", firstSeen: "2023-11-01", lastSeen: "2023-11-01", techniques: ["T0826","T0814","T0812","T0829","T0883","T0828"], groups: ["G1027"], url: "https://attack.mitre.org/campaigns/C0031" },
    { id: "C0034", name: "2022 Ukraine Electric Power Attack", description: "Sandworm Team campaign using GOGETTER, Neo-REGEORG, CaddyWiper, and LotL techniques against Ukrainian electric utility.", firstSeen: "2022-06-01", lastSeen: "2022-10-01", techniques: ["T0853","T0855","T0894","T0895","T0807"], groups: ["G0034"], url: "https://attack.mitre.org/campaigns/C0034" },
    { id: "C0041", name: "FrostyGoop Incident", description: "January 2024 attack against a Ukrainian municipal heating company using FrostyGoop malware via Modbus commands.", firstSeen: "2024-01-01", lastSeen: "2024-01-01", techniques: ["T0836","T0857","T0829","T0826"], groups: [], url: "https://attack.mitre.org/campaigns/C0041" }
  ]
};

// =============================================================================
// State Variables
// =============================================================================

let micsCurrentTab = 'matrix';
let micsCurrentPage = 1;
const MICS_PAGE_SIZE = 25;
let micsSearchTerm = '';
let micsPlatformFilter = 'all';
let micsTacticFilter = 'all';
let micsAssetFilter = 'all';
let micsFilteredTechniques = null;

// =============================================================================
// DOMContentLoaded Entry Point
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
    if (!document.querySelector('.mitre-ics')) return;
    initMitreIcsDashboard();
});

// =============================================================================
// 1. initMitreIcsDashboard
// =============================================================================

function initMitreIcsDashboard() {
    // Populate header meta
    const versionEl = document.getElementById('mics-version');
    if (versionEl) versionEl.textContent = mitreIcsData.stats.version;
    const lastUpdateEl = document.getElementById('mics-lastUpdate');
    if (lastUpdateEl) lastUpdateEl.textContent = mitreIcsData.stats.lastUpdate;

    micsRenderStats();
    micsRenderMatrix();
    micsSetupTabs();
    micsSetupFilters();
    micsSetupModal();
}

// =============================================================================
// 2. micsAnimateCounter
// =============================================================================

function micsAnimateCounter(el, target) {
    if (!el) return;
    const duration = 1000;
    const startTime = performance.now();

    function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Cubic ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased);
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// =============================================================================
// 3. micsRenderStats
// =============================================================================

function micsRenderStats() {
    const container = document.getElementById('mics-stats');
    if (!container) return;

    const stats = mitreIcsData.stats;
    const items = [
        { key: 'techniques', label: 'Techniques', value: stats.techniques, color: '#06b6d4', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>' },
        { key: 'groups', label: 'Groups', value: stats.groups, color: '#a855f7', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' },
        { key: 'software', label: 'Software', value: stats.software, color: '#ec4899', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
        { key: 'mitigations', label: 'Mitigations', value: stats.mitigations, color: '#10b981', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>' },
        { key: 'assets', label: 'Assets', value: stats.assets, color: '#f97316', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>' },
        { key: 'campaigns', label: 'Campaigns', value: stats.campaigns, color: '#3b82f6', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>' }
    ];

    container.innerHTML = items.map(item => `
        <div class="mics-stat-card" style="border-left: 4px solid ${item.color};">
            <div class="mics-stat-icon" style="background: ${item.color}20; color: ${item.color};">
                ${item.icon}
            </div>
            <div class="mics-stat-content">
                <div class="mics-stat-value" data-target="${item.value}">0</div>
                <div class="mics-stat-label">${item.label}</div>
            </div>
        </div>
    `).join('');

    // Animate counters
    container.querySelectorAll('.mics-stat-value').forEach(el => {
        const target = parseInt(el.dataset.target, 10);
        micsAnimateCounter(el, target);
    });
}

// =============================================================================
// 4. micsSetupTabs
// =============================================================================

function micsSetupTabs() {
    const tabs = document.querySelectorAll('.mics-tab-btn');
    const panels = [
        'mics-matrix-panel', 'mics-techniques-panel', 'mics-assets-panel',
        'mics-groups-panel', 'mics-software-panel', 'mics-mitigations-panel',
        'mics-campaigns-panel'
    ];

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            micsCurrentTab = target;

            // Toggle active class
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show/hide panels
            panels.forEach(pid => {
                const panel = document.getElementById(pid);
                if (panel) {
                    panel.style.display = pid === `mics-${target}-panel` ? 'block' : 'none';
                }
            });

            // Render appropriate view
            micsRenderCurrentTab();
        });
    });
}

function micsRenderCurrentTab() {
    switch (micsCurrentTab) {
        case 'matrix': micsRenderMatrix(); break;
        case 'techniques': micsRenderTechniques(); break;
        case 'assets': micsRenderAssets(); break;
        case 'groups': micsRenderGroups(); break;
        case 'software': micsRenderSoftware(); break;
        case 'mitigations': micsRenderMitigations(); break;
        case 'campaigns': micsRenderCampaigns(); break;
    }
}

// =============================================================================
// 5. micsSetupFilters
// =============================================================================

function micsSetupFilters() {
    // Populate platform dropdown
    const platformSelect = document.getElementById('mics-platform-filter');
    if (platformSelect) {
        const platforms = new Set();
        mitreIcsData.techniques.forEach(t => {
            (t.platforms || []).forEach(p => { if (p && p !== 'None') platforms.add(p); });
        });
        // Also pull from software platforms
        mitreIcsData.software.forEach(s => {
            (s.platforms || []).forEach(p => { if (p) platforms.add(p); });
        });
        [...platforms].sort().forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            platformSelect.appendChild(opt);
        });
        platformSelect.addEventListener('change', () => {
            micsPlatformFilter = platformSelect.value;
            micsApplyFilters();
            micsRenderCurrentTab();
        });
    }

    // Populate tactic dropdown
    const tacticSelect = document.getElementById('mics-tactic-filter');
    if (tacticSelect) {
        mitreIcsData.tactics.forEach(tac => {
            const opt = document.createElement('option');
            opt.value = tac.id;
            opt.textContent = tac.name;
            tacticSelect.appendChild(opt);
        });
        tacticSelect.addEventListener('change', () => {
            micsTacticFilter = tacticSelect.value;
            micsApplyFilters();
            micsRenderCurrentTab();
        });
    }

    // Populate asset dropdown
    const assetSelect = document.getElementById('mics-asset-filter');
    if (assetSelect) {
        mitreIcsData.assets.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = a.name;
            assetSelect.appendChild(opt);
        });
        assetSelect.addEventListener('change', () => {
            micsAssetFilter = assetSelect.value;
            micsApplyFilters();
            micsRenderCurrentTab();
        });
    }

    // Search input with debounce
    const searchInput = document.getElementById('mics-search');
    if (searchInput) {
        const debouncedSearch = micsDebounce(() => {
            micsSearchTerm = searchInput.value.trim().toLowerCase();
            micsApplyFilters();
            micsRenderCurrentTab();
        }, 300);
        searchInput.addEventListener('input', debouncedSearch);
    }

    // Reset button
    const resetBtn = document.getElementById('mics-reset-filters');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            micsSearchTerm = '';
            micsPlatformFilter = 'all';
            micsTacticFilter = 'all';
            micsAssetFilter = 'all';
            micsFilteredTechniques = null;
            micsCurrentPage = 1;
            if (searchInput) searchInput.value = '';
            if (platformSelect) platformSelect.value = 'all';
            if (tacticSelect) tacticSelect.value = 'all';
            if (assetSelect) assetSelect.value = 'all';
            micsRenderCurrentTab();
        });
    }

    // Export button
    const exportBtn = document.getElementById('mics-export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', micsExportJSON);
    }
}

// =============================================================================
// 6. micsApplyFilters
// =============================================================================

function micsApplyFilters() {
    let filtered = mitreIcsData.techniques;

    if (micsSearchTerm) {
        filtered = filtered.filter(t =>
            t.name.toLowerCase().includes(micsSearchTerm) ||
            t.mitre_id.toLowerCase().includes(micsSearchTerm)
        );
    }

    if (micsPlatformFilter !== 'all') {
        filtered = filtered.filter(t =>
            (t.platforms || []).includes(micsPlatformFilter)
        );
    }

    if (micsTacticFilter !== 'all') {
        filtered = filtered.filter(t =>
            (t.tactics || []).includes(micsTacticFilter)
        );
    }

    if (micsAssetFilter !== 'all') {
        filtered = filtered.filter(t =>
            (t.assets || []).includes(micsAssetFilter)
        );
    }

    micsFilteredTechniques = filtered.length === mitreIcsData.techniques.length ? null : filtered;
    micsCurrentPage = 1;
}

// =============================================================================
// 7. micsGetFilteredTechniques
// =============================================================================

function micsGetFilteredTechniques() {
    return micsFilteredTechniques || mitreIcsData.techniques;
}

// =============================================================================
// 8. micsRenderMatrix
// =============================================================================

function micsRenderMatrix() {
    const container = document.getElementById('mics-matrix-panel');
    if (!container) return;

    const techniques = micsGetFilteredTechniques();
    const tacticMap = {};
    mitreIcsData.tactics.forEach(tac => { tacticMap[tac.id] = tac; });

    // Group techniques by tactic
    const tacticTechniques = {};
    mitreIcsData.tactics.forEach(tac => { tacticTechniques[tac.id] = []; });

    techniques.forEach(tech => {
        (tech.tactics || []).forEach(tacId => {
            if (tacticTechniques[tacId]) {
                tacticTechniques[tacId].push(tech);
            }
        });
    });

    let html = '<div class="mics-matrix-grid">';
    mitreIcsData.tactics.forEach(tac => {
        const techs = tacticTechniques[tac.id] || [];
        html += `
            <div class="mics-matrix-column">
                <div class="mics-matrix-header">
                    <span class="mics-matrix-tactic-id">${micsEscapeHtml(tac.id)}</span>
                    <span class="mics-matrix-tactic-name">${micsEscapeHtml(tac.name)}</span>
                    <span class="mics-matrix-tactic-count">${techs.length}</span>
                </div>
                <div class="mics-matrix-techniques">
                    ${techs.map(tech => {
                        const assetCount = (tech.assets || []).length;
                        return `
                            <div class="mics-matrix-pill" onclick="micsShowTechniqueDetail('${tech.mitre_id}')">
                                <span class="mics-pill-id">${micsEscapeHtml(tech.mitre_id)}</span>
                                <span class="mics-pill-name">${micsEscapeHtml(tech.name)}</span>
                                ${assetCount > 0 ? `<span class="mics-pill-asset-badge">${assetCount}</span>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// =============================================================================
// 9. micsRenderTechniques
// =============================================================================

function micsRenderTechniques() {
    const container = document.getElementById('mics-techniques-panel');
    if (!container) return;

    const allTechniques = micsGetFilteredTechniques();
    const totalPages = Math.ceil(allTechniques.length / MICS_PAGE_SIZE);
    const startIdx = (micsCurrentPage - 1) * MICS_PAGE_SIZE;
    const paginated = allTechniques.slice(startIdx, startIdx + MICS_PAGE_SIZE);

    const tacticMap = {};
    mitreIcsData.tactics.forEach(t => { tacticMap[t.id] = t.name; });

    let html = `
        <div class="mics-table-info">Showing ${startIdx + 1}-${Math.min(startIdx + MICS_PAGE_SIZE, allTechniques.length)} of ${allTechniques.length} techniques</div>
        <div class="mics-table-wrapper">
        <table class="mics-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Tactics</th>
                    <th>Platforms</th>
                    <th>Assets</th>
                </tr>
            </thead>
            <tbody>
    `;

    paginated.forEach(tech => {
        const tacticBadges = (tech.tactics || []).map(tid =>
            `<span class="mics-badge mics-badge-tactic">${micsEscapeHtml(tacticMap[tid] || tid)}</span>`
        ).join(' ');
        const platformTags = (tech.platforms || []).filter(p => p !== 'None').map(p =>
            `<span class="mics-tag">${micsEscapeHtml(p)}</span>`
        ).join(' ') || '<span class="mics-tag mics-tag-muted">N/A</span>';
        const assetCount = (tech.assets || []).length;

        html += `
            <tr class="mics-table-row" onclick="micsShowTechniqueDetail('${tech.mitre_id}')">
                <td><code class="mics-id-cyan">${micsEscapeHtml(tech.mitre_id)}</code></td>
                <td>${micsEscapeHtml(tech.name)}</td>
                <td>${tacticBadges}</td>
                <td>${platformTags}</td>
                <td>${assetCount > 0 ? `<span class="mics-badge mics-badge-orange">${assetCount}</span>` : '-'}</td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';

    // Pagination
    if (totalPages > 1) {
        html += '<div class="mics-pagination">';
        html += `<button class="mics-page-btn" ${micsCurrentPage <= 1 ? 'disabled' : ''} onclick="micsGoToPage(${micsCurrentPage - 1})">Prev</button>`;
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= micsCurrentPage - 2 && i <= micsCurrentPage + 2)) {
                html += `<button class="mics-page-btn ${i === micsCurrentPage ? 'active' : ''}" onclick="micsGoToPage(${i})">${i}</button>`;
            } else if (i === micsCurrentPage - 3 || i === micsCurrentPage + 3) {
                html += '<span class="mics-page-ellipsis">...</span>';
            }
        }
        html += `<button class="mics-page-btn" ${micsCurrentPage >= totalPages ? 'disabled' : ''} onclick="micsGoToPage(${micsCurrentPage + 1})">Next</button>`;
        html += '</div>';
    }

    container.innerHTML = html;
}

function micsGoToPage(page) {
    const totalPages = Math.ceil(micsGetFilteredTechniques().length / MICS_PAGE_SIZE);
    if (page < 1 || page > totalPages) return;
    micsCurrentPage = page;
    micsRenderTechniques();
}

// =============================================================================
// 10. micsRenderAssets
// =============================================================================

function micsRenderAssets() {
    const container = document.getElementById('mics-assets-panel');
    if (!container) return;

    let assets = mitreIcsData.assets;
    if (micsSearchTerm) {
        assets = assets.filter(a =>
            a.name.toLowerCase().includes(micsSearchTerm) ||
            a.id.toLowerCase().includes(micsSearchTerm) ||
            a.description.toLowerCase().includes(micsSearchTerm)
        );
    }

    // Count techniques per asset
    const assetTechCount = {};
    mitreIcsData.techniques.forEach(t => {
        (t.assets || []).forEach(aid => {
            assetTechCount[aid] = (assetTechCount[aid] || 0) + 1;
        });
    });

    let html = '<div class="mics-card-grid mics-card-grid-3">';
    assets.forEach(asset => {
        const techCount = assetTechCount[asset.id] || 0;
        html += `
            <div class="mics-card mics-card-clickable" onclick="micsShowAssetDetail('${asset.id}')">
                <div class="mics-card-header">
                    <code class="mics-id-orange">${micsEscapeHtml(asset.id)}</code>
                    ${techCount > 0 ? `<span class="mics-badge mics-badge-cyan">${techCount} techniques</span>` : ''}
                </div>
                <div class="mics-card-title">${micsEscapeHtml(asset.name)}</div>
                <div class="mics-card-desc">${micsEscapeHtml(micsTruncate(asset.description, 150))}</div>
                ${asset.sectors && asset.sectors.length ? `<div class="mics-card-tags">${asset.sectors.map(s => `<span class="mics-tag">${micsEscapeHtml(s)}</span>`).join('')}</div>` : ''}
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// =============================================================================
// 11. micsRenderGroups
// =============================================================================

function micsRenderGroups() {
    const container = document.getElementById('mics-groups-panel');
    if (!container) return;

    let groups = mitreIcsData.groups;
    if (micsSearchTerm) {
        groups = groups.filter(g =>
            g.name.toLowerCase().includes(micsSearchTerm) ||
            g.id.toLowerCase().includes(micsSearchTerm) ||
            (g.aliases || []).some(a => a.toLowerCase().includes(micsSearchTerm))
        );
    }

    let html = '<div class="mics-card-grid mics-card-grid-3">';
    groups.forEach(group => {
        const techCount = (group.techniques || []).length;
        const swCount = (group.software || []).length;
        const aliasText = (group.aliases || []).filter(a => a !== group.name).join(', ');

        html += `
            <div class="mics-card mics-card-clickable" onclick="micsShowGroupDetail('${group.id}')">
                <div class="mics-card-header">
                    <code class="mics-id-red">${micsEscapeHtml(group.id)}</code>
                    <div class="mics-card-badges">
                        ${techCount > 0 ? `<span class="mics-badge mics-badge-cyan">${techCount} tech</span>` : ''}
                        ${swCount > 0 ? `<span class="mics-badge mics-badge-pink">${swCount} sw</span>` : ''}
                    </div>
                </div>
                <div class="mics-card-title">${micsEscapeHtml(group.name)}</div>
                ${aliasText ? `<div class="mics-card-aliases">${micsEscapeHtml(micsTruncate(aliasText, 100))}</div>` : ''}
                <div class="mics-card-desc">${micsEscapeHtml(micsTruncate(group.description, 120))}</div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// =============================================================================
// 12. micsRenderSoftware
// =============================================================================

function micsRenderSoftware() {
    const container = document.getElementById('mics-software-panel');
    if (!container) return;

    let software = mitreIcsData.software;
    if (micsSearchTerm) {
        software = software.filter(s =>
            s.name.toLowerCase().includes(micsSearchTerm) ||
            s.id.toLowerCase().includes(micsSearchTerm)
        );
    }

    let html = '<div class="mics-card-grid mics-card-grid-3">';
    software.forEach(sw => {
        const techCount = (sw.techniques || []).length;
        const typeBadgeClass = sw.type === 'Malware' ? 'mics-badge-red' : 'mics-badge-blue';

        html += `
            <div class="mics-card">
                <div class="mics-card-header">
                    <code class="mics-id-pink">${micsEscapeHtml(sw.id)}</code>
                    <span class="mics-badge ${typeBadgeClass}">${micsEscapeHtml(sw.type)}</span>
                </div>
                <div class="mics-card-title">${micsEscapeHtml(sw.name)}</div>
                <div class="mics-card-tags">
                    ${(sw.platforms || []).map(p => `<span class="mics-tag">${micsEscapeHtml(p)}</span>`).join('')}
                </div>
                ${techCount > 0 ? `<div class="mics-card-footer"><span class="mics-badge mics-badge-cyan">${techCount} techniques</span></div>` : ''}
                <a href="${micsEscapeHtml(sw.url)}" target="_blank" rel="noopener noreferrer" class="mics-card-link" onclick="event.stopPropagation();">View on MITRE</a>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// =============================================================================
// 13. micsRenderMitigations
// =============================================================================

function micsRenderMitigations() {
    const container = document.getElementById('mics-mitigations-panel');
    if (!container) return;

    let mitigations = mitreIcsData.mitigations;
    if (micsSearchTerm) {
        mitigations = mitigations.filter(m =>
            m.name.toLowerCase().includes(micsSearchTerm) ||
            m.id.toLowerCase().includes(micsSearchTerm)
        );
    }

    let html = '<div class="mics-card-grid mics-card-grid-3">';
    mitigations.forEach(mit => {
        const techCount = (mit.techniques || []).length;

        html += `
            <div class="mics-card">
                <div class="mics-card-header">
                    <code class="mics-id-green">${micsEscapeHtml(mit.id)}</code>
                    ${techCount > 0 ? `<span class="mics-badge mics-badge-cyan">${techCount} techniques</span>` : ''}
                </div>
                <div class="mics-card-title">${micsEscapeHtml(mit.name)}</div>
                <a href="${micsEscapeHtml(mit.url)}" target="_blank" rel="noopener noreferrer" class="mics-card-link" onclick="event.stopPropagation();">View on MITRE</a>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// =============================================================================
// 14. micsRenderCampaigns
// =============================================================================

function micsRenderCampaigns() {
    const container = document.getElementById('mics-campaigns-panel');
    if (!container) return;

    const groupMap = {};
    mitreIcsData.groups.forEach(g => { groupMap[g.id] = g.name; });

    let campaigns = mitreIcsData.campaigns;
    if (micsSearchTerm) {
        campaigns = campaigns.filter(c =>
            c.name.toLowerCase().includes(micsSearchTerm) ||
            c.id.toLowerCase().includes(micsSearchTerm)
        );
    }

    let html = '<div class="mics-card-grid mics-card-grid-2">';
    campaigns.forEach(camp => {
        const techCount = (camp.techniques || []).length;
        const firstSeen = camp.firstSeen ? camp.firstSeen.substring(0, 10) : 'Unknown';
        const lastSeen = camp.lastSeen ? camp.lastSeen.substring(0, 10) : 'Unknown';

        html += `
            <div class="mics-card">
                <div class="mics-card-header">
                    <code class="mics-id-blue">${micsEscapeHtml(camp.id)}</code>
                    <span class="mics-badge mics-badge-cyan">${techCount} techniques</span>
                </div>
                <div class="mics-card-title">${micsEscapeHtml(camp.name)}</div>
                <div class="mics-card-dates">
                    <span class="mics-date-label">First Seen:</span> ${micsEscapeHtml(firstSeen)}
                    <span class="mics-date-sep">|</span>
                    <span class="mics-date-label">Last Seen:</span> ${micsEscapeHtml(lastSeen)}
                </div>
                <div class="mics-card-desc">${micsEscapeHtml(micsTruncate(camp.description, 200))}</div>
                ${(camp.groups || []).length > 0 ? `
                    <div class="mics-card-tags">
                        ${camp.groups.map(gid => `<span class="mics-badge mics-badge-purple">${micsEscapeHtml(groupMap[gid] || gid)}</span>`).join('')}
                    </div>
                ` : ''}
                <a href="${micsEscapeHtml(camp.url)}" target="_blank" rel="noopener noreferrer" class="mics-card-link" onclick="event.stopPropagation();">View on MITRE</a>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// =============================================================================
// 15. Modal Functions
// =============================================================================

function micsShowTechniqueDetail(mitreId) {
    const tech = mitreIcsData.techniques.find(t => t.mitre_id === mitreId);
    if (!tech) return;

    const tacticMap = {};
    mitreIcsData.tactics.forEach(t => { tacticMap[t.id] = t.name; });
    const assetMap = {};
    mitreIcsData.assets.forEach(a => { assetMap[a.id] = a.name; });
    const groupMap = {};
    mitreIcsData.groups.forEach(g => { groupMap[g.id] = g.name; });
    const swMap = {};
    mitreIcsData.software.forEach(s => { swMap[s.id] = s.name; });
    const mitMap = {};
    mitreIcsData.mitigations.forEach(m => { mitMap[m.id] = m.name; });

    const tacticBadges = (tech.tactics || []).map(tid =>
        `<span class="mics-badge mics-badge-tactic">${micsEscapeHtml(tacticMap[tid] || tid)}</span>`
    ).join(' ');

    const platformTags = (tech.platforms || []).filter(p => p !== 'None').map(p =>
        `<span class="mics-tag">${micsEscapeHtml(p)}</span>`
    ).join(' ') || '<span class="mics-tag mics-tag-muted">N/A</span>';

    const assetList = (tech.assets || []).map(aid =>
        `<a href="#" class="mics-modal-link" onclick="event.preventDefault(); micsShowAssetDetail('${aid}');">${micsEscapeHtml(assetMap[aid] || aid)}</a>`
    ).join(', ') || 'None';

    const groupList = (tech.groups || []).map(gid =>
        `<a href="#" class="mics-modal-link" onclick="event.preventDefault(); micsShowGroupDetail('${gid}');">${micsEscapeHtml(groupMap[gid] || gid)}</a>`
    ).join(', ') || 'None';

    const swList = (tech.software || []).map(sid =>
        `<span class="mics-badge mics-badge-pink">${micsEscapeHtml(swMap[sid] || sid)}</span>`
    ).join(' ') || 'None';

    const mitList = (tech.mitigations || []).map(mid =>
        `<span class="mics-badge mics-badge-green">${micsEscapeHtml(mitMap[mid] || mid)}</span>`
    ).join(' ') || 'None';

    const content = `
        <div class="mics-modal-header">
            <code class="mics-id-cyan">${micsEscapeHtml(tech.mitre_id)}</code>
            <h2>${micsEscapeHtml(tech.name)}</h2>
        </div>
        <div class="mics-modal-section">
            <h3>Tactics</h3>
            <div>${tacticBadges}</div>
        </div>
        <div class="mics-modal-section">
            <h3>Platforms</h3>
            <div>${platformTags}</div>
        </div>
        <div class="mics-modal-section">
            <h3>Targeted Assets</h3>
            <div class="mics-modal-asset-list">${assetList}</div>
        </div>
        <div class="mics-modal-section">
            <h3>Mitigations</h3>
            <div class="mics-modal-badge-list">${mitList}</div>
        </div>
        <div class="mics-modal-section">
            <h3>Related Groups</h3>
            <div>${groupList}</div>
        </div>
        <div class="mics-modal-section">
            <h3>Related Software</h3>
            <div class="mics-modal-badge-list">${swList}</div>
        </div>
        <div class="mics-modal-section">
            <a href="${micsEscapeHtml(tech.url)}" target="_blank" rel="noopener noreferrer" class="mics-modal-ext-link">View on MITRE ATT&CK</a>
        </div>
    `;

    micsOpenModal(content);
}

function micsShowGroupDetail(id) {
    const group = mitreIcsData.groups.find(g => g.id === id);
    if (!group) return;

    const techMap = {};
    mitreIcsData.techniques.forEach(t => { techMap[t.mitre_id] = t.name; });
    const swMap = {};
    mitreIcsData.software.forEach(s => { swMap[s.id] = s.name; });

    const aliases = (group.aliases || []).filter(a => a !== group.name).join(', ');

    const techList = (group.techniques || []).map(tid =>
        `<a href="#" class="mics-modal-link" onclick="event.preventDefault(); micsShowTechniqueDetail('${tid}');">${micsEscapeHtml(tid)} - ${micsEscapeHtml(techMap[tid] || 'Unknown')}</a>`
    ).join('<br>') || 'None';

    const swList = (group.software || []).map(sid =>
        `<span class="mics-badge mics-badge-pink">${micsEscapeHtml(swMap[sid] || sid)}</span>`
    ).join(' ') || 'None';

    const content = `
        <div class="mics-modal-header">
            <code class="mics-id-red">${micsEscapeHtml(group.id)}</code>
            <h2>${micsEscapeHtml(group.name)}</h2>
        </div>
        ${aliases ? `<div class="mics-modal-section"><h3>Aliases</h3><div class="mics-modal-aliases">${micsEscapeHtml(aliases)}</div></div>` : ''}
        <div class="mics-modal-section">
            <h3>Description</h3>
            <p>${micsEscapeHtml(group.description)}</p>
        </div>
        <div class="mics-modal-section">
            <h3>Techniques</h3>
            <div>${techList}</div>
        </div>
        <div class="mics-modal-section">
            <h3>Software</h3>
            <div class="mics-modal-badge-list">${swList}</div>
        </div>
        <div class="mics-modal-section">
            <a href="${micsEscapeHtml(group.url)}" target="_blank" rel="noopener noreferrer" class="mics-modal-ext-link">View on MITRE ATT&CK</a>
        </div>
    `;

    micsOpenModal(content);
}

function micsShowAssetDetail(id) {
    const asset = mitreIcsData.assets.find(a => a.id === id);
    if (!asset) return;

    // Find techniques targeting this asset
    const relatedTechniques = mitreIcsData.techniques.filter(t =>
        (t.assets || []).includes(id)
    );

    const techList = relatedTechniques.map(t =>
        `<a href="#" class="mics-modal-link" onclick="event.preventDefault(); micsShowTechniqueDetail('${t.mitre_id}');">${micsEscapeHtml(t.mitre_id)} - ${micsEscapeHtml(t.name)}</a>`
    ).join('<br>') || 'None';

    const relatedNames = (asset.relatedAssets || []).map(r =>
        typeof r === 'string' ? r : r
    ).join(', ');

    const content = `
        <div class="mics-modal-header">
            <code class="mics-id-orange">${micsEscapeHtml(asset.id)}</code>
            <h2>${micsEscapeHtml(asset.name)}</h2>
        </div>
        <div class="mics-modal-section">
            <h3>Description</h3>
            <p>${micsEscapeHtml(asset.description)}</p>
        </div>
        ${asset.sectors && asset.sectors.length ? `
            <div class="mics-modal-section">
                <h3>Sectors</h3>
                <div>${asset.sectors.map(s => `<span class="mics-tag">${micsEscapeHtml(s)}</span>`).join(' ')}</div>
            </div>
        ` : ''}
        ${relatedNames ? `
            <div class="mics-modal-section">
                <h3>Related Assets</h3>
                <div class="mics-modal-aliases">${micsEscapeHtml(relatedNames)}</div>
            </div>
        ` : ''}
        <div class="mics-modal-section">
            <h3>Techniques Targeting This Asset (${relatedTechniques.length})</h3>
            <div class="mics-modal-scrollable">${techList}</div>
        </div>
        <div class="mics-modal-section">
            <a href="${micsEscapeHtml(asset.url)}" target="_blank" rel="noopener noreferrer" class="mics-modal-ext-link">View on MITRE ATT&CK</a>
        </div>
    `;

    micsOpenModal(content);
}

function micsOpenModal(content) {
    const overlay = document.getElementById('mics-modal-overlay');
    const body = document.getElementById('mics-modal-body');
    if (!overlay || !body) return;

    body.innerHTML = content;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function micsCloseModal() {
    const overlay = document.getElementById('mics-modal-overlay');
    if (!overlay) return;

    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

function micsSetupModal() {
    const overlay = document.getElementById('mics-modal-overlay');
    if (!overlay) return;

    // Close button
    const closeBtn = overlay.querySelector('.mics-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', micsCloseModal);
    }

    // Backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            micsCloseModal();
        }
    });

    // Escape key and / shortcut
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            micsCloseModal();
        }
        if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
            const searchInput = document.getElementById('mics-search');
            const dashboard = document.getElementById('dashboard-mitre-attack-ics');
            if (searchInput && dashboard && dashboard.classList.contains('active')) {
                if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    searchInput.focus();
                }
            }
        }
    });
}

// =============================================================================
// 16. Utility Functions
// =============================================================================

function micsDebounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function micsEscapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function micsTruncate(str, len) {
    if (!str) return '';
    if (str.length <= len) return str;
    return str.substring(0, len) + '...';
}

function micsExportJSON() {
    let data;
    let filename;

    switch (micsCurrentTab) {
        case 'matrix':
        case 'techniques':
            data = micsGetFilteredTechniques();
            filename = 'mitre-ics-techniques.json';
            break;
        case 'assets':
            data = mitreIcsData.assets;
            filename = 'mitre-ics-assets.json';
            break;
        case 'groups':
            data = mitreIcsData.groups;
            filename = 'mitre-ics-groups.json';
            break;
        case 'software':
            data = mitreIcsData.software;
            filename = 'mitre-ics-software.json';
            break;
        case 'mitigations':
            data = mitreIcsData.mitigations;
            filename = 'mitre-ics-mitigations.json';
            break;
        case 'campaigns':
            data = mitreIcsData.campaigns;
            filename = 'mitre-ics-campaigns.json';
            break;
        default:
            data = mitreIcsData;
            filename = 'mitre-ics-data.json';
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
