import { parseMusanedText } from '../src/lib/parsers/musaned';

const testTexts = [
  "Name: TISE RUKIYA ADEM ID number: EQ2159929 DoB: 28/08/2000 Gender: Female Marital status: Married Religion: Muslim Job: House Maid Mobile: +251927332446",
  "Name: AMINA HASSAN CITY ID number: EQ1234567 DoB: 01/01/1990",
  "Name: LELISE SHUMI ASRATE ID number: EP9384992",
  "Name: Hayatuden Jemal ID number: EQ2336598"
];

for (const t of testTexts) {
  console.log("Input:", t);
  console.log("Parsed:", parseMusanedText(t));
  console.log("-----------------------------------");
}
