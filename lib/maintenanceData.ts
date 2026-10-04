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

    defectionTypes: [
      "MAIN POWER SUPPLY",
      "WELDING MACHINE ELECTRIC",
      "WELDING MACHINE COOLING",
      "WELDING MACHINE PNEUMATIC",
      "WELDING MACHINE MECHANIC",
      "NUT FEEDER ELECTRIC",
      "NUT FEEDER MECHANIC",
      "NUT FEEDER PNEUMATIC",
      "FIXTURE PNEUMATIC",
      "FIXTURE ELECTRIC",
      "SAFETY",
      "OTHER",
    ],
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

    defectionTypes: [
      "MAIN POWER SUPPLY",
      "UNCOILER MECHANIC",
      "UNCOILER ELECTRIC",
      "UNCOILER HYDRAULIC",
      "FEEDER ELECTRIC",
      "FEEDER MECHANIC",
      "FEEDER PNEUMATIC",
      "BOLSTER",
      "OVERLOAD",
      "PRESS PNEUMATIC",
      "PRESS HYDRAULIC LUBRICATION",
      "PRESS ELECTRIC AUTOMATION",
      "PRESS MECHANIC",
      "CONVEYOR BANT",
      "AUTOMATION",
      "SAFETY",
      "OTHER",
    ],
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

    defectionTypes: [
      "MAIN POWER SUPPLY",
      "DESTACKER MECHANIC",
      "DESTACKER ELECTRIC",
      "DESTACKER LOAD CAR",
      "BOLSTER",
      "OVERLOAD",
      "PRESS PNEUMATIC",
      "PRESS HYDRAULIC LUBRICATION",
      "PRESS ELECTRIC AUTOMATION",
      "PRESS MECHANIC",
      "CONVEYOR BANT",
      "AUTOMATION",
      "SAFETY",
      "TRANSFER",
      "OTHER",
    ],
  },

  MARK: {
    machines: ["MARK-7", "MARK-8", "MARK-9", "MARK-10", "MARK-11"],

    subEquipment: ["PRESS", "CONVEYOR", "DIE", "SAFETY"],

    defectionTypes: [
      "MAIN POWER SUPPLY",
      "LASER GRAVE ELECTRIC",
      "LASER GRAVE PNEUMATIC",
      "FIXTURE ELECTRIC",
      "FIXTURE PNEUMATIC",
      "SAFETY",
      "OTHER",
    ],
  },
};

export const mainEquipment = Object.keys(equipmentData);
