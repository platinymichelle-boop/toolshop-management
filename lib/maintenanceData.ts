const sapDefectionTypes = [
  "ARB1 - Breakdown Indirect Labor consumption",
  "ARB2 - Other Maintenance Activities",
  "ARB3 - Breakdown Consumable consumption",
  "ARB4 - Breakdown spare part consumption",
  "ARB5 - Maintenance Missing Spare Parts",
  "ARB6 - Production missing Indirect material",
  "ARB7 - Speed losses caused by machine and apparatus",
  "ARB8 - Different Machine/Apparatus Usage",
  "ARU1 - Machine breakdown losses",
  "ARU2 - Apparatus breakdown losses",
  "ARU3 - Plant breakdown losses",
  "ARU5 - Breakdown losses due to production",
  "ARU6 - Die breakdown",
  "ARU7 - Lifter breakdown",
  "ARU8 - Arrangement welding parameters",
  "ARU9 - Temporary staffing for Maintenance",
  "BIK1 - Losses caused by IT",
  "EEK1 - Loss of labor due to lack of energy",
  "EKK2 - Electrical Loss",
  "EKK3 - Air Loss",
  "EKK4 - Water Loss",
  "EKK5 - Loss of Natural Gas",
  "IKK1 - Internal Education",
  "IKK2 - Outside Education",
  "KL02 - Waiting for quality control approval",
  "KL12 - Dimensional Setting (Quality Special Request)",
  "KDK1 - Minor stoppage",
  "SET1 - Mold binding and startup",
  "SET2 - Changing the Apparatus",
  "SET3 - Robot Setup",
  "TDK1 - Periodic Maintenance",
  "TDK2 - Equipment / Revision Improvement",
  "TET1 - Autonomous maintenance",
  "UAY1 - Lack of equipment",
  "UAY2 - Forklift or Crane waiting",
  "YBD6 - Preparation non-standard textbook",
  "YDA2 - Working for project (Sample, test etc.)",
  "YDA3 - Losses caused by design",
  "YDA4 - Plant, Apparatus, Machine displacement",
  "YDA5 - Purchasing sample, test",
];

export const equipmentData = {
  NUT: {
    machines: [
      "APR-618",
      "APR-619",
      "APR-620",
      "APR-629",
      "APR-634",
      "APR-635",
      "APR-636",
      "APR-637",
      "APR-638",
      "APR-639",
      "MECVIL",
    ],

    subEquipment: ["WELDING MACHINE", "NUT FEEDER", "FIXTURE", "SAFETY"],

    defectionTypes: sapDefectionTypes,
  },

  "PRESS PROGRESSIVE": {
    machines: ["P-103", "P-104", "P-105", "P-108", "P-109"],

    subEquipment: [
      "UNCOILER",
      "FEEDER",
      "BOLSTER",
      "PRESS",
      "CONVEYOR",
      "DIE",
      "SAFETY",
    ],

    defectionTypes: sapDefectionTypes,
  },

  "PRESS TRANSFER": {
    machines: ["P-106", "P-107"],

    subEquipment: [
      "DESTACKER",
      "TRANSFER",
      "PRESS",
      "BOLSTER",
      "CONVEYOR",
      "DIE",
      "SAFETY",
    ],

    defectionTypes: sapDefectionTypes,
  },

  MARK: {
    machines: ["MARK-7", "MARK-8", "MARK-9", "MARK-10", "MARK-11"],

    subEquipment: ["PRESS", "CONVEYOR", "DIE", "SAFETY"],

    defectionTypes: sapDefectionTypes,
  },
};

export const mainEquipment = Object.keys(equipmentData);
