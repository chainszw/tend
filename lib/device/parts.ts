/**
 * Concept bill of materials for the Tend Home Station. Costs are rough
 * per-unit estimates in Indian rupees for small-batch sourcing; this is a
 * design study, not a quote and not a manufactured product.
 */

export interface DevicePart {
  id: string;
  name: string;
  material: string;
  role: string;
  costInr: number;
  /** Inside the main unit, or a separate accessory that plugs in or pairs. */
  where: "main unit" | "accessory";
  optional?: boolean;
}

export const DEVICE_PARTS: readonly DevicePart[] = [
  {
    id: "shell",
    name: "Outer shell",
    material: "Injection-moulded ABS plastic, matte white, with a knitted polyester speaker band",
    role: "Wipe-clean body with no sharp edges. The sloped top faces the screen towards a seated person.",
    costInr: 140,
    where: "main unit",
  },
  {
    id: "lcd",
    name: "3.5 inch colour screen",
    material: "TFT LCD panel with a resistive touch layer under scratch-resistant acrylic",
    role: "Shows large numbers and simple menus. Resistive touch works with dry or shaky fingers.",
    costInr: 450,
    where: "main unit",
  },
  {
    id: "buttons",
    name: "Three push buttons",
    material: "Silicone rubber caps over tactile dome switches",
    role: "Back, Start/Stop and Power. Everything can be done without touching the screen.",
    costInr: 45,
    where: "main unit",
  },
  {
    id: "board",
    name: "Controller board",
    material: "ESP32-class microcontroller with Wi-Fi and Bluetooth on a two-layer FR4 circuit board",
    role: "Runs the menus, reads every sensor and sends readings to the family.",
    costInr: 330,
    where: "main unit",
  },
  {
    id: "pump",
    name: "Air pump",
    material: "Miniature 6 V diaphragm pump, plastic housing with a rubber diaphragm",
    role: "Inflates the arm cuff for a blood pressure reading.",
    costInr: 180,
    where: "main unit",
  },
  {
    id: "valve",
    name: "Release valve",
    material: "Small solenoid valve, brass core in a nylon body",
    role: "Lets the air out slowly and evenly so the pressure can be read on the way down.",
    costInr: 90,
    where: "main unit",
  },
  {
    id: "sensor",
    name: "Pressure sensor",
    material: "Silicon piezoresistive sensor, 0 to 40 kPa, in an epoxy package",
    role: "Feels the tiny pulses in the cuff that give the systolic, diastolic and pulse values.",
    costInr: 160,
    where: "main unit",
  },
  {
    id: "battery",
    name: "Battery and charging",
    material: "2000 mAh lithium-ion cell with a protection circuit and a USB-C charging board",
    role: "Keeps working through power cuts. Charges from any phone charger.",
    costInr: 260,
    where: "main unit",
  },
  {
    id: "speaker",
    name: "Speaker",
    material: "40 mm paper-cone speaker with a small class-D amplifier chip",
    role: "Reads instructions and results aloud, clearly and loudly.",
    costInr: 100,
    where: "main unit",
  },
  {
    id: "mic",
    name: "Microphone",
    material: "MEMS digital microphone behind a fabric dust mesh",
    role: "Hears spoken commands such as \"blood pressure\" or \"start\".",
    costInr: 90,
    where: "main unit",
  },
  {
    id: "cuff",
    name: "Arm cuff and air tube",
    material: "Nylon fabric cuff with a TPU air bladder, hook-and-loop strap and silicone tube",
    role: "Wraps the upper arm (22 to 42 cm). Plugs into the air port on the side of the unit.",
    costInr: 250,
    where: "accessory",
  },
  {
    id: "oximeter",
    name: "Finger clip (pulse oximeter)",
    material: "ABS clip with a silicone pad, red and infrared LEDs and a photodiode",
    role: "Shines light through the fingertip to estimate blood oxygen and heart rate.",
    costInr: 220,
    where: "accessory",
  },
  {
    id: "thermometer",
    name: "Thermometer probe",
    material: "NTC thermistor in a stainless-steel tip on an ABS stick",
    role: "Measures body temperature. Rests in the holder on the side of the unit.",
    costInr: 80,
    where: "accessory",
  },
  {
    id: "scale",
    name: "Weighing scale",
    material: "Four strain-gauge load cells under a tempered-glass platform, Bluetooth board, AAA cells",
    role: "Sends weight to the unit wirelessly. Sold separately for homes that want it.",
    costInr: 450,
    where: "accessory",
    optional: true,
  },
];

/** Total estimated cost, with or without the optional parts. */
export function partsTotal(parts: readonly DevicePart[], includeOptional: boolean): number {
  return parts
    .filter((part) => includeOptional || !part.optional)
    .reduce((sum, part) => sum + part.costInr, 0);
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}
