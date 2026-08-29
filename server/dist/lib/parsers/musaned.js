"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMusanedText = parseMusanedText;
const cvHelpers_1 = require("../cvHelpers");
function parseMusanedText(text) {
    const data = {};
    // PDF text has NO spaces between values and the next label.
    // Example: "JEMALID number:", "MarriedReligion:", "House MaidMobile:"
    // We must insert spaces before known labels to separate them.
    const labelsToSeparate = [
        'ID number', 'DoB', 'Gender', 'Marital status', 'Religion',
        'Job', 'Mobile', 'Skills', 'Education level', 'E-Mail',
        'Languages', 'Height', 'Weight', 'Number of Children', 'Passport No',
        'Expiration date', 'Issue date', 'Issue place', 'Place of Issue', 'Passport Issue Place',
        'Country', 'City', 'Address', 'Name', 'Kinship', 'Place of birth', 'Place of Birth', 'Birth place', 'Birth Place',
        'Mobile No', 'Address Information', 'Emergency Contact',
        'Passport Information', 'Personal Information', 'First Name', 'Last Name', 'Surname', 'Given Names'
    ];
    let normalized = text.replace(/[\r\n]+/g, ' ');
    // Insert a space before each known label so values are cleanly separated
    for (const label of labelsToSeparate) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Match the label optionally followed by a colon
        normalized = normalized.replace(new RegExp(`(?<!^)(?=${escaped}:?)`, 'gi'), ' ');
    }
    // Collapse extra spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();
    // Build lookahead dynamically
    const nextLabelPattern = labelsToSeparate.map(l => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':?').join('|');
    // Helper to extract values following a specific label.
    const extract = (label) => {
        let source = '';
        if (label instanceof RegExp) {
            source = label.source;
        }
        else {
            source = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }
        const regex = new RegExp(`${source}:?\\s*(.*?)(?=\\s+(?:${nextLabelPattern})|$)`, 'i');
        const match = normalized.match(regex);
        return match && match[1] ? match[1].trim() : undefined;
    };
    // Passport Number
    const passportRaw = extract(/(?:Passport No|ID number|Passport Number)/i);
    data.passportNumber = passportRaw ? passportRaw.replace(/[^A-Z0-9]/gi, '').toUpperCase() : undefined;
    // ── Name Parsing (Step-by-step) ──
    const cleanText = (t) => t.replace(/[^a-zA-Z\s]/g, '');
    const normalizeName = (name) => name.trim().replace(/\s+/g, ' ');
    const splitName = (fullName) => fullName.split(' ');
    const parseName = (fullName) => {
        const clean = normalizeName(cleanText(fullName));
        const parts = splitName(clean);
        let givenNames = '';
        let surname = '';
        if (parts.length === 1) {
            givenNames = parts[0];
        }
        else if (parts.length >= 2) {
            surname = parts[0];
            givenNames = parts.slice(1).join(' ');
        }
        return { givenNames, surname };
    };
    // Smart Detection: If CV has First Name / Last Name
    const firstName = extract(/(?:First Name|Given Names)/i);
    const lastName = extract(/(?:Last Name|Surname)/i);
    if (firstName && lastName) {
        data.givenNames = normalizeName(cleanText(firstName));
        data.surname = normalizeName(cleanText(lastName));
    }
    else {
        const nameStr = extract(/(?:Name|Full Name)/i);
        if (nameStr) {
            const { givenNames, surname } = parseName(nameStr);
            data.givenNames = givenNames;
            data.surname = surname;
        }
    }
    // Job
    data.job = extract(/(?:Job|Occupation|Designation)/i);
    // Religion
    data.religion = extract(/(?:Religion|Sect)/i);
    // Marital Status
    data.maritalStatus = extract(/(?:Marital status|Marital Status|Marriage Status)/i);
    // Date of Birth
    const dobRaw = extract(/(?:DoB|Date of birth|Date of Birth)/i);
    if (dobRaw) {
        const dateMatch = dobRaw.match(/(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})/);
        data.dateOfBirth = dateMatch ? dateMatch[1] : dobRaw;
    }
    // Phone / Mobile
    data.phone = extract(/(?:Mobile|Phone|Telephone|Contact Number)/i);
    // Gender
    data.gender = extract(/(?:Gender|Sex)/i);
    // Expiration Date
    const doeRaw = extract(/(?:Expiration date|Expiry Date|Date of Expiry|Expiration Date)/i);
    if (doeRaw) {
        const dateMatch = doeRaw.match(/(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})/);
        data.dateOfExpiry = dateMatch ? dateMatch[1] : doeRaw;
    }
    // Issue Date
    const doiRaw = extract(/(?:Issue date|Date of Issue|Issue Date)/i);
    if (doiRaw) {
        const dateMatch = doiRaw.match(/(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})/);
        data.dateOfIssue = dateMatch ? dateMatch[1] : doiRaw;
    }
    // Issue Place / Issuing Country
    data.placeOfIssue = extract(/(?:Issue place|Place of Issue|Issuing Country|Passport Issue Place)/i);
    data.issuingCountry = data.placeOfIssue;
    // Place of Birth
    data.placeOfBirth = extract(/(?:Place of birth|Birth place|Place of Birth|Birth Place)/i);
    // Address Country
    const addressCountry = extract(/(?:Address Information\s+Country|Country(?=\s+City|\s+Address))/i) || extract(/Country/i);
    // Nationality (derived from Country of address)
    data.nationality = (0, cvHelpers_1.resolveCandidateNationality)({
        country: addressCountry,
        issuingCountry: data.issuingCountry,
        placeOfBirth: data.placeOfBirth,
        nationality: extract(/Nationality/i),
    });
    // Email
    data.email = extract(/(?:E-Mail|Email|E Mail)/i);
    // Education Level
    data.educationLevel = extract(/(?:Education level|Education Level|Education)/i);
    // Height
    data.height = extract(/(?:Height)/i);
    // Weight
    data.weight = extract(/(?:Weight)/i);
    // Languages
    data.languages = extract(/(?:Languages|Language)/i);
    // Skills
    data.skills = extract(/(?:Skills|Skill)/i);
    // Number of Children
    data.numberOfChildren = extract(/(?:Number of Children|No of Children|Children)/i);
    // City
    data.city = extract(/(?:City)/i);
    // Address
    data.address = extract(/(?:Address(?!\s+Information))/i);
    // Emergency Contact
    data.emergencyContactName = extract(/(?:Emergency Contact Name|Emergency Contact Name:)/i) || extract(/Emergency Contact\s+Name/i);
    data.emergencyContactRelation = extract(/(?:Kinship|Relationship)/i);
    data.emergencyContactPhone = extract(/(?:Mobile No|Emergency Contact Phone|Emergency Phone)/i);
    // Emergency Address
    const emergencyAddrRaw = extract(/(?:Emergency Contact Address|Emergency Address)/i);
    if (emergencyAddrRaw) {
        data.emergencyContactAddress = emergencyAddrRaw;
    }
    else {
        // Fallback if address is inside the mobile No block
        const mobAddressMatch = normalized.match(/Mobile No:\s*[\+\d]+\s+Address:\s*(.*?)(?=\s+(?:${nextLabelPattern})|$)/i);
        if (mobAddressMatch && mobAddressMatch[1]) {
            data.emergencyContactAddress = mobAddressMatch[1].trim();
        }
    }
    return data;
}
