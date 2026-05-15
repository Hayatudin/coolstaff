export interface ExtractedMusanedData {
  passportNumber?: string;
  givenNames?: string;
  surname?: string;
  nationality?: string;
  job?: string;
  dateOfBirth?: string;
  religion?: string;
  maritalStatus?: string;
  phone?: string;
  gender?: string;
  dateOfExpiry?: string;
  dateOfIssue?: string;
  placeOfIssue?: string;
  email?: string;
  educationLevel?: string;
  skills?: string;
  numberOfChildren?: string;
  city?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  emergencyContactAddress?: string;
}

export function parseMusanedText(text: string): ExtractedMusanedData {
  const data: ExtractedMusanedData = {};

  // PDF text has NO spaces between values and the next label.
  // Example: "JEMALID number:", "MarriedReligion:", "House MaidMobile:"
  // We must insert spaces before known labels to separate them.
  
  const labelsToSeparate = [
    'ID number:', 'DoB:', 'Gender:', 'Marital status:', 'Religion:', 
    'Job:', 'Mobile:', 'Skills:', 'Education level:', 'E-Mail:', 
    'Languages:', 'Number of Children:', 'Passport No:', 
    'Expiration date:', 'Issue date:', 'Issue place:', 
    'Country:', 'City:', 'Address:', 'Name:', 'Kinship:', 
    'Mobile No:', 'Address Information', 'Emergency Contact',
    'Passport Information', 'Personal Information'
  ];

  let normalized = text.replace(/[\r\n]+/g, ' ');
  
  // Insert a space before each known label so values are cleanly separated
  for (const label of labelsToSeparate) {
    // Use a regex that finds the label even when stuck to previous text
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(`(?<!^)(?=${escaped})`, 'gi'), ' ');
  }
  
  // Collapse extra spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  // Helper to extract values following a specific label.
  const extract = (labelRegex: RegExp) => {
    const match = normalized.match(labelRegex);
    return match && match[1] ? match[1].trim() : undefined;
  };

  // Passport Number
  data.passportNumber = extract(/(?:Passport No|ID number):\s*([A-Z0-9]+)/i);

  // ── Name Parsing (Step-by-step) ──

  // Step 6: Clean invalid characters
  const cleanText = (t: string) => t.replace(/[^a-zA-Z\s]/g, '');

  // Step 1: Normalize input
  const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ');

  // Step 2: Split into parts
  const splitName = (fullName: string) => fullName.split(' ');

  // Step 3 + 4: Core logic with edge cases
  const parseName = (fullName: string) => {
    const clean = normalizeName(cleanText(fullName));
    const parts = splitName(clean);

    let givenNames = '';
    let surname = '';

    if (parts.length === 1) {
      givenNames = parts[0];
    } else if (parts.length === 2) {
      givenNames = parts[0];
      surname = parts[1];
    } else if (parts.length === 3) {
      givenNames = parts.slice(0, 2).join(' ');
      surname = parts[2];
    } else if (parts.length > 3) {
      givenNames = parts.slice(0, 2).join(' ');
      surname = parts.slice(2).join(' ');
    }

    return { givenNames, surname };
  };

  // Smart Detection: If CV has separate First Name / Last Name fields, use them directly
  const firstName = extract(/First Name:\s*([A-Za-z\s]+?)(?=\s+(?:Last|Surname|ID|DoB|Gender|Marital|Religion|Job|Mobile|$))/i);
  const lastName = extract(/(?:Last Name|Surname):\s*([A-Za-z\s]+?)(?=\s+(?:First|ID|DoB|Gender|Marital|Religion|Job|Mobile|$))/i);

  if (firstName && lastName) {
    // Skip parsing and use directly
    data.givenNames = normalizeName(cleanText(firstName));
    data.surname = normalizeName(cleanText(lastName));
  } else {
    // Extract full name from "Name:" label and parse
    const nameStr = extract(/Name:\s*([A-Za-z\s]+?)(?=\s+(?:ID number|DoB|Gender|Marital|Religion|Job|Mobile|Passport|Skills|$))/i);
    if (nameStr) {
      const { givenNames, surname } = parseName(nameStr);
      data.givenNames = givenNames;
      data.surname = surname;
    }
  }

  // Job
  data.job = extract(/Job:\s*([A-Za-z\s]+?)(?=\s+(?:Skills|ID number|Gender|Religion|Mobile|Education|Languages|$))/i);

  // Religion
  data.religion = extract(/Religion:\s*([A-Za-z]+)/i);

  // Marital Status
  data.maritalStatus = extract(/Marital status:\s*([A-Za-z]+)/i);

  // Date of Birth
  data.dateOfBirth = extract(/DoB:\s*(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})/i);

  // Phone / Mobile
  data.phone = extract(/Mobile:\s*([\+\d]+)/i);

  // Gender
  data.gender = extract(/Gender:\s*([A-Za-z]+)/i);

  // Expiration Date
  data.dateOfExpiry = extract(/Expiration date:\s*(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})/i);

  // Issue Date
  data.dateOfIssue = extract(/Issue date:\s*(\d{2}[-/]\d{2}[-/]\d{4}|\d{4}[-/]\d{2}[-/]\d{2})/i);

  // Issue Place
  data.placeOfIssue = extract(/Issue place:\s*([A-Za-z\s]+?)(?=\s+(?:Address|Country|City|$))/i);

  // Nationality (derived from Country)
  data.nationality = extract(/Country:\s*([A-Za-z]+)/i);

  // Email
  data.email = extract(/E-Mail:\s*([^\s]+@[^\s]+)/i);

  // Education Level
  data.educationLevel = extract(/Education level:\s*([A-Za-z\s]+?)(?=\s+(?:E-Mail|Languages|Number|Skills|$))/i);

  // Skills
  data.skills = extract(/Skills:\s*([A-Za-z,\s&]+?)(?=\s+(?:Education|E-Mail|Languages|Number|$))/i);

  // Number of Children
  data.numberOfChildren = extract(/Number of Children:\s*(\d+)/i);

  // City
  data.city = extract(/City:\s*([A-Za-z\s]+?)(?=\s+(?:Address|Emergency|$))/i);

  // Address
  data.address = extract(/Address:\s*([A-Za-z\s]+?)(?=\s+(?:Emergency|$))/i);

  // Emergency Contact
  data.emergencyContactName = extract(/Emergency Contact\s+Name:\s*([A-Za-z\s]+?)(?=\s+(?:Kinship|Mobile|Address|$))/i);
  data.emergencyContactRelation = extract(/Kinship:\s*([A-Za-z]+)/i);
  data.emergencyContactPhone = extract(/Mobile No:\s*([\+\d]+)/i);
  data.emergencyContactAddress = extract(/Mobile No:\s*[\+\d]+\s+Address:\s*([A-Za-z\s]+?)$/i);

  return data;
}
