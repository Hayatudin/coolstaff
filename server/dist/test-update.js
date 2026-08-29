"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./lib/prisma"));
async function test() {
    try {
        console.log("Creating dummy candidate...");
        const dummy = await prisma_1.default.candidate.create({
            data: {
                shelfId: "999",
                passportNumber: "TEST-UPDATE-PASS",
                surname: "DUMMY",
                givenNames: "CANDIDATE",
                dateOfBirth: new Date("1990-01-01"),
                gender: "Female",
                nationality: "Ethiopian",
                issuingCountry: "ETHIOPIA",
                dateOfIssue: new Date("2020-01-01"),
                dateOfExpiry: new Date("2025-01-01"),
                placeOfBirth: "ADDIS ABABA",
                maritalStatus: "Single",
                numberOfChildren: 0,
                religion: "Muslim",
                bloodType: "O+",
            }
        });
        console.log("Created dummy candidate with ID:", dummy.id);
        console.log("Attempting update with error payload...");
        const updated = await prisma_1.default.candidate.update({
            where: { id: dummy.id },
            data: {
                passportNumber: "EQ1298432",
                surname: "DABESA",
                givenNames: "CHALTU BEKELE",
                dateOfBirth: new Date("1999-03-25T00:00:00.000Z"),
                gender: "Female",
                nationality: "Ethiopia",
                issuingCountry: "ETHIOPIA",
                dateOfIssue: new Date("2024-12-17T00:00:00.000Z"),
                dateOfExpiry: new Date("2029-12-16T00:00:00.000Z"),
                placeOfBirth: "WONCHI",
                idNumber: "EQ1298432",
                job: "HOUSE MAID",
                maritalStatus: "Married",
                numberOfChildren: 2,
                religion: "Non muslim",
                bloodType: "",
                height: "160",
                weight: "55",
                phone: "+251900000000",
                email: "test@example.com",
                address: "Wonchi",
                city: "Wonchi",
                state: "Wonchi",
                country: "Ethiopia",
                educationLevel: "Elementary",
                languages: ["English"],
                workExperience: [],
                skills: ["COOKING", "CLEANING"],
                medicalStatus: "Pending",
                biometricStatus: "Pending",
                medicalDate: null,
                biometricDate: null,
                knownConditions: "",
                emergencyContactName: "Contact",
                emergencyContactRelation: "Brother",
                emergencyContactPhone: "+25191111111",
                emergencyContactAddress: "Addis Ababa",
                additionalPhones: [],
                brokerId: null,
                allowVideo: false,
                status: "pending",
                isRequested: false,
                visaSelected: false,
            }
        });
        console.log("Update successful!");
        // Clean up
        await prisma_1.default.candidate.delete({
            where: { id: dummy.id }
        });
        console.log("Deleted dummy candidate.");
    }
    catch (err) {
        console.error("Operation failed with error:");
        console.error(err);
    }
}
test().then(() => process.exit(0));
