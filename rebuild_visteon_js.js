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
    },

    // ── Q22–Q31: New Basic ECU Control Logic Programs ──────────────────────

    {
        id: 'VISTEON-FUEL',
        topicId: 'VISTEON_C',
        title: 'Q22: Fuel Level Monitor',
        difficulty: 'Basic',
        points: 80,
        statement: 'Simulate a Fuel Level Monitor. Read the fuel level (0-100%) in a while(1) loop.\n\nLogic:\n- If fuel < 10: Print "CRITICAL: Fuel Empty - Stop Now!"\n- If fuel < 25: Print "Warning: Low Fuel"\n- If fuel < 50: Print "Fuel Below Half"\n- Otherwise: Print "Fuel OK"\n\nConstraints: Use only if/else and while. No arrays or functions.',
        acceptance: ['Correct fuel thresholds', 'while loop used', 'All 4 states handled'],
        deliverables: ['main.c'],
        inputSpec: 'Integer fuel % (e.g. 8)',
        outputSpec: 'Fuel status string',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int fuel;\n    while(scanf("%d", &fuel) == 1) {\n        // TODO: Check fuel thresholds and print status\n    }\n    return 0;\n}' }],
        testCases: [
            { name: 'Critical', stdin: '8', expectedOutput: 'CRITICAL: Fuel Empty - Stop Now!' },
            { name: 'Low', stdin: '20', expectedOutput: 'Warning: Low Fuel' },
            { name: 'Half', stdin: '40', expectedOutput: 'Fuel Below Half' },
            { name: 'OK', stdin: '80', expectedOutput: 'Fuel OK' }
        ]
    },

    {
        id: 'VISTEON-RPM',
        topicId: 'VISTEON_C',
        title: 'Q23: RPM Redline Warning System',
        difficulty: 'Basic',
        points: 80,
        statement: 'Simulate an RPM Warning System. Read RPM value in a while(1) loop.\n\nLogic:\n- If RPM > 7000: Print "DANGER: Redline! Ease Off!"\n- If RPM > 5500: Print "Warning: High RPM"\n- If RPM > 3000: Print "RPM Normal"\n- Otherwise: Print "Low RPM - Acceleration Needed"\n\nConstraints: Use only if/else and while. No arrays or functions.',
        acceptance: ['4 RPM zones handled', 'while loop used'],
        deliverables: ['main.c'],
        inputSpec: 'Integer RPM value',
        outputSpec: 'RPM status string',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int rpm;\n    while(scanf("%d", &rpm) == 1) {\n        // TODO: Check RPM zones\n    }\n    return 0;\n}' }],
        testCases: [
            { name: 'Redline', stdin: '7500', expectedOutput: 'DANGER: Redline! Ease Off!' },
            { name: 'High', stdin: '6000', expectedOutput: 'Warning: High RPM' },
            { name: 'Normal', stdin: '4000', expectedOutput: 'RPM Normal' },
            { name: 'Low', stdin: '1500', expectedOutput: 'Low RPM - Acceleration Needed' }
        ]
    },

    {
        id: 'VISTEON-OIL',
        topicId: 'VISTEON_C',
        title: 'Q24: Oil Pressure Safety Monitor',
        difficulty: 'Basic',
        points: 80,
        statement: 'Simulate an Oil Pressure Monitor. Read pressure in PSI in a while(1) loop.\n\nLogic:\n- If pressure < 15: Print "CRITICAL: Oil Pressure Low - Engine Shutdown!"\n- If pressure < 30: Print "Warning: Oil Pressure Low"\n- If pressure <= 80: Print "Oil Pressure Normal"\n- Otherwise: Print "Warning: Oil Pressure High"\n\nConstraints: Use only if/else and while. No arrays or functions.',
        acceptance: ['All 4 pressure zones', 'while loop used'],
        deliverables: ['main.c'],
        inputSpec: 'Integer PSI value',
        outputSpec: 'Oil pressure status',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int psi;\n    while(scanf("%d", &psi) == 1) {\n        // TODO: Check pressure zones\n    }\n    return 0;\n}' }],
        testCases: [
            { name: 'Critical', stdin: '10', expectedOutput: 'CRITICAL: Oil Pressure Low - Engine Shutdown!' },
            { name: 'Low Warn', stdin: '22', expectedOutput: 'Warning: Oil Pressure Low' },
            { name: 'Normal', stdin: '55', expectedOutput: 'Oil Pressure Normal' },
            { name: 'High', stdin: '90', expectedOutput: 'Warning: Oil Pressure High' }
        ]
    },

    {
        id: 'VISTEON-IGNITION',
        topicId: 'VISTEON_C',
        title: 'Q25: Ignition Key Position Selector',
        difficulty: 'Basic',
        points: 70,
        statement: 'Simulate an Ignition Key Controller. Read the key position in a while(1) loop.\n\nUse a switch statement:\n- 0: Print "Engine OFF"\n- 1: Print "Accessories ON"\n- 2: Print "Engine ON - Ready"\n- 3: Print "Starting Engine..."\n- Default: Print "Invalid Key Position"\n\nConstraints: Use switch and while only. No arrays or functions.',
        acceptance: ['Switch statement used', '5 positions handled', 'while loop used'],
        deliverables: ['main.c'],
        inputSpec: 'Integer key position (0-3)',
        outputSpec: 'Engine status string',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int key;\n    while(scanf("%d", &key) == 1) {\n        switch(key) {\n            // TODO: handle each case\n        }\n    }\n    return 0;\n}' }],
        testCases: [
            { name: 'OFF', stdin: '0', expectedOutput: 'Engine OFF' },
            { name: 'ACC', stdin: '1', expectedOutput: 'Accessories ON' },
            { name: 'ON', stdin: '2', expectedOutput: 'Engine ON - Ready' },
            { name: 'Start', stdin: '3', expectedOutput: 'Starting Engine...' },
            { name: 'Invalid', stdin: '5', expectedOutput: 'Invalid Key Position' }
        ]
    },

    {
        id: 'VISTEON-CLIMATE',
        topicId: 'VISTEON_C',
        title: 'Q26: Climate Control Logic',
        difficulty: 'Basic',
        points: 90,
        statement: 'Simulate a Climate Control Module. Read Cabin Temperature and Setpoint Temperature in a while(1) loop.\n\nLogic:\n- If cabin > setpoint + 3: Print "A/C Cooling: Fan High"\n- If cabin > setpoint: Print "A/C Cooling: Fan Low"\n- If cabin < setpoint - 3: Print "Heater: Fan High"\n- If cabin < setpoint: Print "Heater: Fan Low"\n- Otherwise: Print "Temperature OK - Fan Off"\n\nConstraints: Use only if/else and while. No arrays or functions.',
        acceptance: ['5 zones handled', 'Both inputs used', 'while loop used'],
        deliverables: ['main.c'],
        inputSpec: 'Two integers: cabin_temp setpoint',
        outputSpec: 'Climate status string',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int cabin, setpoint;\n    while(scanf("%d %d", &cabin, &setpoint) == 2) {\n        // TODO: Compare cabin vs setpoint\n    }\n    return 0;\n}' }],
        testCases: [
            { name: 'Very Hot', stdin: '30 22', expectedOutput: 'A/C Cooling: Fan High' },
            { name: 'Slightly Hot', stdin: '24 22', expectedOutput: 'A/C Cooling: Fan Low' },
            { name: 'Very Cold', stdin: '15 22', expectedOutput: 'Heater: Fan High' },
            { name: 'Slightly Cold', stdin: '20 22', expectedOutput: 'Heater: Fan Low' },
            { name: 'OK', stdin: '22 22', expectedOutput: 'Temperature OK - Fan Off' }
        ]
    },

    {
        id: 'VISTEON-BRAKE',
        topicId: 'VISTEON_C',
        title: 'Q27: Brake Fluid Pressure Monitor',
        difficulty: 'Basic',
        points: 80,
        statement: 'Simulate a Brake Pressure Monitor. Read brake fluid pressure (bar) in a while(1) loop.\n\nLogic:\n- If pressure < 5: Print "CRITICAL: Brake Failure! Stop Vehicle!"\n- If pressure < 10: Print "Warning: Brake Pressure Low"\n- If pressure <= 20: Print "Brake Pressure Normal"\n- Otherwise: Print "Warning: Brake Pressure Excessive"\n\nConstraints: Use only if/else and while. No arrays or functions.',
        acceptance: ['4 pressure zones', 'while loop used'],
        deliverables: ['main.c'],
        inputSpec: 'Integer bar value',
        outputSpec: 'Brake pressure status',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int bar;\n    while(scanf("%d", &bar) == 1) {\n        // TODO: Check brake pressure zones\n    }\n    return 0;\n}' }],
        testCases: [
            { name: 'Critical', stdin: '3', expectedOutput: 'CRITICAL: Brake Failure! Stop Vehicle!' },
            { name: 'Low', stdin: '7', expectedOutput: 'Warning: Brake Pressure Low' },
            { name: 'Normal', stdin: '15', expectedOutput: 'Brake Pressure Normal' },
            { name: 'Excessive', stdin: '25', expectedOutput: 'Warning: Brake Pressure Excessive' }
        ]
    },

    {
        id: 'VISTEON-THROTTLE',
        topicId: 'VISTEON_C',
        title: 'Q28: Throttle Position Drive Mode',
        difficulty: 'Basic',
        points: 70,
        statement: 'Simulate a Throttle Position Sensor. Read throttle % (0-100) in a while(1) loop.\n\nLogic:\n- If throttle == 0: Print "Engine Idle"\n- If throttle <= 25: Print "Economy Mode"\n- If throttle <= 60: Print "Normal Drive Mode"\n- If throttle <= 85: Print "Sport Mode"\n- Otherwise: Print "FULL THROTTLE"\n\nConstraints: Use only if/else and while. No arrays or functions.',
        acceptance: ['5 throttle zones', 'while loop used'],
        deliverables: ['main.c'],
        inputSpec: 'Integer 0-100 (throttle %)',
        outputSpec: 'Drive mode string',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int throttle;\n    while(scanf("%d", &throttle) == 1) {\n        // TODO: Check throttle zones\n    }\n    return 0;\n}' }],
        testCases: [
            { name: 'Idle', stdin: '0', expectedOutput: 'Engine Idle' },
            { name: 'Economy', stdin: '15', expectedOutput: 'Economy Mode' },
            { name: 'Normal', stdin: '45', expectedOutput: 'Normal Drive Mode' },
            { name: 'Sport', stdin: '75', expectedOutput: 'Sport Mode' },
            { name: 'Full', stdin: '95', expectedOutput: 'FULL THROTTLE' }
        ]
    },

    {
        id: 'VISTEON-WIPER2',
        topicId: 'VISTEON_C',
        title: 'Q29: Wiper Speed Controller',
        difficulty: 'Basic',
        points: 70,
        statement: 'Simulate a Wiper Speed Controller. Read rain sensor level (0-100) and wiper switch (0=off, 1=on) in a while(1) loop.\n\nLogic (only if switch is ON):\n- If rain > 70: Print "Wiper: Fast"\n- If rain > 40: Print "Wiper: Medium"\n- If rain > 10: Print "Wiper: Slow"\n- Otherwise: Print "Wiper: Off"\nIf switch is OFF: Print "Wiper: Off"\n\nConstraints: Use only if/else and while. No arrays or functions.',
        acceptance: ['Switch state checked', '4 wiper speeds', 'while loop used'],
        deliverables: ['main.c'],
        inputSpec: 'Two integers: rain_level wiper_switch',
        outputSpec: 'Wiper speed string',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int rain, sw;\n    while(scanf("%d %d", &rain, &sw) == 2) {\n        // TODO: Check switch, then rain level\n    }\n    return 0;\n}' }],
        testCases: [
            { name: 'Heavy Rain', stdin: '80 1', expectedOutput: 'Wiper: Fast' },
            { name: 'Medium Rain', stdin: '50 1', expectedOutput: 'Wiper: Medium' },
            { name: 'Light Rain', stdin: '20 1', expectedOutput: 'Wiper: Slow' },
            { name: 'No Rain', stdin: '5 1', expectedOutput: 'Wiper: Off' },
            { name: 'Switch Off', stdin: '90 0', expectedOutput: 'Wiper: Off' }
        ]
    },

    {
        id: 'VISTEON-COOLANT',
        topicId: 'VISTEON_C',
        title: 'Q30: Coolant Temperature & Fan Speed',
        difficulty: 'Basic',
        points: 90,
        statement: 'Simulate a Coolant Temperature Controller. Read coolant temperature (°C) in a while(1) loop.\n\nLogic:\n- If temp > 120: Print "CRITICAL OVERHEAT - Shutdown Now!"\n- If temp > 100: Print "High Temp - Fan Max Speed"\n- If temp > 85: Print "Warm - Fan Medium Speed"\n- If temp >= 60: Print "Normal - Fan Low Speed"\n- Otherwise: Print "Engine Cold - Fan Off"\n\nConstraints: Use only if/else and while. No arrays or functions.',
        acceptance: ['5 temperature zones', 'while loop used'],
        deliverables: ['main.c'],
        inputSpec: 'Integer temperature (°C)',
        outputSpec: 'Coolant status string',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int temp;\n    while(scanf("%d", &temp) == 1) {\n        // TODO: Check coolant temperature zones\n    }\n    return 0;\n}' }],
        testCases: [
            { name: 'Critical', stdin: '125', expectedOutput: 'CRITICAL OVERHEAT - Shutdown Now!' },
            { name: 'High', stdin: '105', expectedOutput: 'High Temp - Fan Max Speed' },
            { name: 'Warm', stdin: '90', expectedOutput: 'Warm - Fan Medium Speed' },
            { name: 'Normal', stdin: '70', expectedOutput: 'Normal - Fan Low Speed' },
            { name: 'Cold', stdin: '40', expectedOutput: 'Engine Cold - Fan Off' }
        ]
    },

    {
        id: 'VISTEON-AIRBAG',
        topicId: 'VISTEON_C',
        title: 'Q31: Airbag System Status Monitor',
        difficulty: 'Intermediate',
        points: 100,
        statement: 'Simulate an Airbag System Status Monitor. Read:\n- Impact Force (G-force, integer)\n- Seatbelt Status (1=buckled, 0=unbuckled)\n\nLogic in a while(1) loop:\n- If impact > 30: Print "AIRBAG DEPLOYED"\n- If impact > 20 and seatbelt == 0: Print "AIRBAG DEPLOYED" (unbelted + moderate crash)\n- If impact > 20 and seatbelt == 1: Print "Severe Impact - Monitoring"\n- If impact > 10: Print "Minor Impact - Alert"\n- Otherwise: Print "System Normal"\n\nConstraints: Use only if/else and while. No arrays or functions.',
        acceptance: ['5 conditions handled', 'Both inputs used', 'while loop used'],
        deliverables: ['main.c'],
        inputSpec: 'Two integers: impact_g seatbelt',
        outputSpec: 'Airbag status string',
        files: [{ name: 'main.c', content: '#include <stdio.h>\n\nint main() {\n    int impact, seatbelt;\n    while(scanf("%d %d", &impact, &seatbelt) == 2) {\n        // TODO: Check impact and seatbelt conditions\n    }\n    return 0;\n}' }],
        testCases: [
            { name: 'Critical Impact', stdin: '35 1', expectedOutput: 'AIRBAG DEPLOYED' },
            { name: 'Unbelted Crash', stdin: '25 0', expectedOutput: 'AIRBAG DEPLOYED' },
            { name: 'Severe Belted', stdin: '25 1', expectedOutput: 'Severe Impact - Monitoring' },
            { name: 'Minor Impact', stdin: '15 1', expectedOutput: 'Minor Impact - Alert' },
            { name: 'Normal', stdin: '5 1', expectedOutput: 'System Normal' }
        ]
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
