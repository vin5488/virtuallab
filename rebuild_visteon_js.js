const fs = require('fs');

const csvPath = 'C:/Users/Vinay/Downloads/embedded-coding-challenge-platform/Participants_List.csv';
const visteonJsPath = 'C:/Users/Vinay/Downloads/embedded-coding-challenge-platform/visteon_questions.js';

const csvContent = fs.readFileSync(csvPath, 'utf8');
const emails = csvContent.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+/g) || [];
const uniqueEmails = [...new Set(emails.map(e => e.trim().toLowerCase()))];

const questions = [
    {
        id: 'VISTEON-VCU',
        topicId: 'VISTEON_C',
        title: 'Q1: Vehicle Control Unit Simulation',
        difficulty: 'Basic',
        points: 100,
        statement: 'Simulate a simple Vehicle Control Unit (VCU) that reads Speed, Engine Temperature, and Gear Position in a continuous loop. \n\nLogic:\n1. Overspeed: If Speed > 120 km/h, print "Warning: Overspeed", else "Speed Normal".\n2. Temperature: If > 110: "Critical Overheat", > 95: "High Temperature", else "Temperature Normal".\n3. Gear (Switch): 0: Neutral, 1-5: First to Fifth Gear, else: "Invalid Gear".\n\nConstraints: Use only if/else, switch, and while(1). No arrays or functions.',
        acceptance: ['Correct use of while(1)', 'Switch case for gears', 'Nested if/else logic'],
        deliverables: ['main.c'],
        inputSpec: 'Space separated integers: Speed, Temperature, Gear. Repeat until end of input.',
        outputSpec: 'A response for each input set.',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int speed, temp, gear;\n    while(1) {\n        if(scanf("%d %d %d", &speed, &temp, &gear) != 3) break;\n        \n        // TODO: Implement Logic\n        \n        printf("Enter Speed: "); // Dummy for interactive\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Sample 1', stdin: '130 98 3', expectedOutput: 'Warning: Overspeed\nHigh Temperature\nThird Gear' }]
    },
    {
        id: 'VISTEON-HEADLIGHT',
        topicId: 'VISTEON_C',
        title: 'Q2: Smart Headlight Controller',
        difficulty: 'Basic',
        points: 50,
        statement: 'Logic: If Light < 20: "Headlights ON", else "Headlights OFF". If HighBeam == 1: "High Beam ACTIVE". If FogLight == 1: "Fog Lights ON".',
        acceptance: ['Simple if logic'],
        deliverables: ['main.c'],
        inputSpec: 'Light(0-100), HighBeam(0/1), FogLight(0/1)',
        outputSpec: 'System responses',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int light, hb, fl;\n    while(scanf("%d %d %d", &light, &hb, &fl) == 3) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Dark', stdin: '10 1 0', expectedOutput: 'Headlights ON\nHigh Beam ACTIVE' }]
    },
    {
        id: 'VISTEON-DOOR',
        topicId: 'VISTEON_C',
        title: 'Q3: Door Ajar Alarm System',
        difficulty: 'Basic',
        points: 60,
        statement: 'Logic: If Door==1 and Speed > 5: "ALARM: Door Open!", else if Door==1: "Warning: Door Open", else: "Doors Secured".',
        acceptance: ['Logical operators AND'],
        deliverables: ['main.c'],
        inputSpec: 'Door(0/1), Speed',
        outputSpec: 'Alarm status',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int door, speed;\n    while(scanf("%d %d", &door, &speed) == 2) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Moving Open', stdin: '1 20', expectedOutput: 'ALARM: Door Open!' }]
    },
    {
        id: 'VISTEON-FUEL',
        topicId: 'VISTEON_C',
        title: 'Q4: Fuel Level Intelligence',
        difficulty: 'Basic',
        points: 50,
        statement: 'Logic: < 10: "Critical Low", < 25: "Low Fuel", > 75: "Fuel Full", else: "Fuel Normal".',
        acceptance: ['Multi-level if-else'],
        deliverables: ['main.c'],
        inputSpec: 'Fuel %',
        outputSpec: 'Status',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int fuel;\n    while(scanf("%d", &fuel) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Low', stdin: '5', expectedOutput: 'Critical Low' }]
    },
    {
        id: 'VISTEON-ACC',
        topicId: 'VISTEON_C',
        title: 'Q5: Adaptive Cruise Control Logic',
        difficulty: 'Intermediate',
        points: 100,
        statement: 'Logic: If Distance < 20: "Braking", < 50: "Maintaining Distance", else: "Accelerating".',
        acceptance: ['Comparison logic'],
        deliverables: ['main.c'],
        inputSpec: 'Distance(m)',
        outputSpec: 'Action',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int dist;\n    while(scanf("%d", &dist) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Close', stdin: '15', expectedOutput: 'Braking' }]
    },
    {
        id: 'VISTEON-TPMS',
        topicId: 'VISTEON_C',
        title: 'Q6: Tire Pressure Monitoring (TPMS)',
        difficulty: 'Basic',
        points: 70,
        statement: 'Logic: < 25 PSI: "Low Pressure", > 45 PSI: "High Pressure", else: "Pressure OK".',
        acceptance: ['Simple range checks'],
        deliverables: ['main.c'],
        inputSpec: 'PSI',
        outputSpec: 'Warning',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int psi;\n    while(scanf("%d", &psi) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Flat', stdin: '20', expectedOutput: 'Low Pressure' }]
    },
    {
        id: 'VISTEON-PARKING',
        topicId: 'VISTEON_C',
        title: 'Q7: Parking Sensor Beep Logic',
        difficulty: 'Basic',
        points: 80,
        statement: 'Logic: Distance < 10: "STOP", < 30: "Continuous", < 100: "Intermittent", else: "Silent".',
        acceptance: ['Proximity logic'],
        deliverables: ['main.c'],
        inputSpec: 'Distance(cm)',
        outputSpec: 'Beep intensity',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int dist;\n    while(scanf("%d", &dist) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Near', stdin: '25', expectedOutput: 'Continuous' }]
    },
    {
        id: 'VISTEON-SEATBELT',
        topicId: 'VISTEON_C',
        title: 'Q8: Seatbelt Reminder Module',
        difficulty: 'Intermediate',
        points: 90,
        statement: 'Logic: If Present==1 and Belt==0 and Speed > 10: "LOUD ALARM", else if Present==1 and Belt==0: "Visual Warning", else: "OK".',
        acceptance: ['Compound conditions'],
        deliverables: ['main.c'],
        inputSpec: 'Present(0/1), Belt(0/1), Speed',
        outputSpec: 'Alert type',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int p, b, s;\n    while(scanf("%d %d %d", &p, &b, &s) == 3) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Unbuckled Fast', stdin: '1 0 25', expectedOutput: 'LOUD ALARM' }]
    },
    {
        id: 'VISTEON-BMS',
        topicId: 'VISTEON_C',
        title: 'Q9: Battery Health Monitor',
        difficulty: 'Intermediate',
        points: 100,
        statement: 'Logic: Voltage < 11.5: "Low Battery", > 14.8: "Overcharging", 12.6-14.4: "Healthy", else: "Normal".',
        acceptance: ['Floating point or fixed point handling'],
        deliverables: ['main.c'],
        inputSpec: 'Voltage (multiply by 10 for int logic if preferred, or use float)',
        outputSpec: 'Health status',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    float v;\n    while(scanf("%f", &v) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Overcharge', stdin: '15.2', expectedOutput: 'Overcharging' }]
    },
    {
        id: 'VISTEON-WIPER',
        topicId: 'VISTEON_C',
        title: 'Q10: Rain-Sensing Wiper Control',
        difficulty: 'Basic',
        points: 50,
        statement: 'Logic (Switch on Intensity): 0: "OFF", 1: "Low", 2: "Medium", 3: "High", else: "Invalid".',
        acceptance: ['Switch-case usage'],
        deliverables: ['main.c'],
        inputSpec: 'Intensity(0-3)',
        outputSpec: 'Wiper Speed',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int rain;\n    while(scanf("%d", &rain) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Heavy', stdin: '3', expectedOutput: 'High' }]
    },
    {
        id: 'VISTEON-SHIFT',
        topicId: 'VISTEON_C',
        title: 'Q11: Gear Shift Indicator',
        difficulty: 'Intermediate',
        points: 110,
        statement: 'Logic: If RPM > 3000: "UP-SHIFT", RPM < 1500: "DOWN-SHIFT", else: "OK".',
        acceptance: ['RPM range logic'],
        deliverables: ['main.c'],
        inputSpec: 'RPM',
        outputSpec: 'Recommendation',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int rpm;\n    while(scanf("%d", &rpm) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'High RPM', stdin: '3500', expectedOutput: 'UP-SHIFT' }]
    },
    {
        id: 'VISTEON-IMMOBILIZER',
        topicId: 'VISTEON_C',
        title: 'Q12: Engine Immobilizer System',
        difficulty: 'Intermediate',
        points: 80,
        statement: 'Logic: If KeyID == 1234: "Engine Started", else: "Access Denied". Allow 3 attempts before clearing memory.',
        acceptance: ['Correct ID match', 'Attempt counter logic'],
        deliverables: ['main.c'],
        inputSpec: 'KeyID (int)',
        outputSpec: 'Status message',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int key, count = 0;\n    while(scanf("%d", &key) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Valid', stdin: '1234', expectedOutput: 'Engine Started' }]
    },
    {
        id: 'VISTEON-ABS',
        topicId: 'VISTEON_C',
        title: 'Q13: Anti-lock Braking System (ABS) Logic',
        difficulty: 'Advanced',
        points: 120,
        statement: 'Logic: If BrakeApplied == 1 and WheelSpeed < 5 and VehicleSpeed > 10: "ABS ENGAGED", else: "Normal Braking".',
        acceptance: ['Slip detection logic'],
        deliverables: ['main.c'],
        inputSpec: 'Brake(0/1), WheelSpeed, VehicleSpeed',
        outputSpec: 'Braking mode',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int b, ws, vs;\n    while(scanf("%d %d %d", &b, &ws, &vs) == 3) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Slip', stdin: '1 2 20', expectedOutput: 'ABS ENGAGED' }]
    },
    {
        id: 'VISTEON-TRANS',
        topicId: 'VISTEON_C',
        title: 'Q14: Automatic Transmission Mode',
        difficulty: 'Basic',
        points: 50,
        statement: 'Logic (Switch): P: "Park", R: "Reverse", N: "Neutral", D: "Drive", S: "Sport", else: "Invalid".',
        acceptance: ['Switch case for characters'],
        deliverables: ['main.c'],
        inputSpec: 'Mode Char',
        outputSpec: 'Mode name',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    char mode;\n    while(scanf(" %c", &mode) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Drive', stdin: 'D', expectedOutput: 'Drive' }]
    },
    {
        id: 'VISTEON-FAN',
        topicId: 'VISTEON_C',
        title: 'Q15: Cooling Fan Control',
        difficulty: 'Basic',
        points: 60,
        statement: 'Logic: If Temp > 100: "Fan High", > 90: "Fan Low", else: "Fan OFF".',
        acceptance: ['Temperature thresholds'],
        deliverables: ['main.c'],
        inputSpec: 'Temp',
        outputSpec: 'Fan state',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int t;\n    while(scanf("%d", &t) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'High', stdin: '105', expectedOutput: 'Fan High' }]
    },
    {
        id: 'VISTEON-ESC',
        topicId: 'VISTEON_C',
        title: 'Q16: Electronic Stability Control (ESC)',
        difficulty: 'Advanced',
        points: 150,
        statement: 'Logic: If abs(YawRate - SteeringAngle) > 10: "ESC Intervention", else: "Stable".',
        acceptance: ['Math logic (abs equivalent)'],
        deliverables: ['main.c'],
        inputSpec: 'YawRate, SteeringAngle',
        outputSpec: 'Stability status',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int yr, sa, diff;\n    while(scanf("%d %d", &yr, &sa) == 2) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Skid', stdin: '30 5', expectedOutput: 'ESC Intervention' }]
    },
    {
        id: 'VISTEON-PKE',
        topicId: 'VISTEON_C',
        title: 'Q17: Passive Keyless Entry (PKE)',
        difficulty: 'Basic',
        points: 40,
        statement: 'Logic: If SignalStrength > 70: "Doors Unlocked", < 20: "Doors Locked", else: "Wait".',
        acceptance: ['Range checks'],
        deliverables: ['main.c'],
        inputSpec: 'Strength(0-100)',
        outputSpec: 'Lock status',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int s;\n    while(scanf("%d", &s) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Near', stdin: '85', expectedOutput: 'Doors Unlocked' }]
    },
    {
        id: 'VISTEON-TPC',
        topicId: 'VISTEON_C',
        title: 'Q18: TPMS Temp Compensation',
        difficulty: 'Intermediate',
        points: 100,
        statement: 'Logic: CompensatedPressure = RawPressure - (Temp - 25) * 0.1. If Compensated < 30: "Low", else "OK".',
        acceptance: ['Arithmetic with floats'],
        deliverables: ['main.c'],
        inputSpec: 'RawPressure, Temp',
        outputSpec: 'Status',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    float p, t;\n    while(scanf("%f %f", &p, &t) == 2) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Cold Low', stdin: '28 5', expectedOutput: 'Low' }]
    },
    {
        id: 'VISTEON-EPS',
        topicId: 'VISTEON_C',
        title: 'Q19: Power Steering Assist',
        difficulty: 'Intermediate',
        points: 90,
        statement: 'Logic: If Speed < 20: "High Assist", < 60: "Medium Assist", else: "Low Assist".',
        acceptance: ['Speed-sensitive logic'],
        deliverables: ['main.c'],
        inputSpec: 'Speed',
        outputSpec: 'Assist Level',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int s;\n    while(scanf("%d", &s) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Parking', stdin: '10', expectedOutput: 'High Assist' }]
    },
    {
        id: 'VISTEON-TCS',
        topicId: 'VISTEON_C',
        title: 'Q20: Traction Control System (TCS)',
        difficulty: 'Advanced',
        points: 130,
        statement: 'Logic: If WheelSlip > 15: "Reduce Torque", else "Maintain Torque".',
        acceptance: ['Slip percentage logic'],
        deliverables: ['main.c'],
        inputSpec: 'WheelSlip%',
        outputSpec: 'Torque Command',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int slip;\n    while(scanf("%d", &slip) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Spin', stdin: '20', expectedOutput: 'Reduce Torque' }]
    },
    {
        id: 'VISTEON-SUSP',
        topicId: 'VISTEON_C',
        title: 'Q21: Dynamic Suspension',
        difficulty: 'Intermediate',
        points: 100,
        statement: 'Logic: If Mode == 1 (Sport): "Stiff Dampers", Mode == 2 (Comfort): "Soft Dampers", else: "Normal".',
        acceptance: ['Simple mode switch'],
        deliverables: ['main.c'],
        inputSpec: 'Mode(1/2)',
        outputSpec: 'Suspension Status',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int m;\n    while(scanf("%d", &m) == 1) {\n        // TODO\n    }\n    return 0;\n}' }],
        testCases: [{ name: 'Sport', stdin: '1', expectedOutput: 'Stiff Dampers' }]
    }
];

const jsOutput = `window.VISTEON_WHITELIST = ${JSON.stringify(uniqueEmails, null, 4)};

window.isVisteonUser = function (email) {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    const isWhitelisted = window.VISTEON_WHITELIST.some(e => e.trim().toLowerCase() === cleanEmail);
    const hasVisteonDomain = cleanEmail.endsWith('@visteon.com');
    return isWhitelisted || hasVisteonDomain;
};

window.VISTEON_PROJECTS = ${JSON.stringify(questions, null, 4)};
`;

fs.writeFileSync(visteonJsPath, jsOutput);
console.log('visteon_questions.js updated with ' + uniqueEmails.length + ' emails.');
