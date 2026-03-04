window.VISTEON_WHITELIST = [
    "achandel@visteon.com",
    "ppranee3@visteon.com",
    "tnair@visteon.com",
    "hreddy2@visteon.com",
    "rraman4@visteon.com",
    "mayan@visteon.com",
    "skrishak@visteon.com",
    "msanthos@visteon.com",
    "nvijaya1@visteon.com",
    "psingh17@visteon.com",
    "vkumar65@visteon.com",
    "mzubair1@visteon.com",
    "spachaiy@visteon.com",
    "bmariyan@visteon.com",
    "galekya@visteon.com",
    "pganesh6@visteon.com",
    "svishwa@visteon.com",
    "ddevi1@visteon.com",
    "gayswar@visteon.com",
    "abaravka@visteon.com",
    "asarava7@visteon.com",
    "vnaraya9@visteon.com",
    "ttipathi@visteon.com",
    "ssenth16@visteon.com",
    "pmennaks@visteon.com",
    "bbabu1@visteon.com",
    "abalu@visteon.com",
    "csuresh@visteon.com",
    "sesther@visteon.com",
    "psatpath@visteon.com",
    "gnawin@visteon.com",
    "ageethar@visteon.com",
    "csamchri@visteon.com",
    "hmanivan@visteon.com",
    "hsubram3@visteon.com",
    "mveluman@visteon.com",
    "mmohidee@visteon.com",
    "sgopal3@visteon.com",
    "sasokan2@visteon.com",
    "vezhilan@visteon.com",
    "vsubbura@visteon.com",
    "trangara@visteon.com",
    "agani@visteon.com",
    "travi4@visteon.com",
    "nsenthi6@visteon.com",
    "sarulana@visteon.com",
    "mjayapr1@visteon.com",
    "kkarupp2@visteon.com",
    "rvaithi1@visteon.com",
    "sselvam3@visteon.com",
    "pvinoth1@visteon.com",
    "abajpaye@visteon.com",
    "schatte2@visteon.com",
    "rkumari2@visteon.com",
    "tparween@visteon.com",
    "jsingh15@visteon.com",
    "gdey@visteon.com",
    "paditya@visteon.com",
    "achoudh4@visteon.com",
    "pbhatt1@visteon.com",
    "anandi@visteon.com",
    "schattop@visteon.com",
    "rverma4@visteon.com",
    "skarmak1@visteon.com",
    "oprasad@visteon.com",
    "sbasu5@visteon.com",
    "slahiri@visteon.com",
    "pmaity@visteon.com",
    "sdas21@visteon.com",
    "apratap@visteon.com",
    "skrish34@visteon.com",
    "rsharm18@visteon.com"
];

window.isVisteonUser = function (email) {
    if (!email) return false;
    const cleanEmail = email.trim().toLowerCase();
    const isWhitelisted = window.VISTEON_WHITELIST.some(e => e.trim().toLowerCase() === cleanEmail);
    const hasVisteonDomain = cleanEmail.endsWith('@visteon.com');
    return isWhitelisted || hasVisteonDomain;
};

window.VISTEON_PROJECTS = [
    {
        "id": "VISTEON-01",
        "topicId": "VISTEON_C",
        "title": "Q1: Data Types & Bitwise Register Simulation",
        "difficulty": "Intermediate",
        "points": 100,
        "statement": "Simulate an 8-bit hardware control register. You are given a function that receives commands like \"SET_BIT 3\", \"CLEAR_BIT 5\", or \"TOGGLE_BIT 1\". Implement the logic to modify a global static 8-bit unsigned integer representing the register, and print its value in hexadecimal after each operation. Write robust code using bitwise operators.",
        "acceptance": [
            "Correct use of bitwise OR/AND/XOR",
            "Hexadecimal parsing and printing",
            "Static memory duration implemented"
        ],
        "deliverables": [
            "main.c"
        ],
        "inputSpec": "A sequence of operations, e.g., SET_BIT 3\nCLEAR_BIT 3\nQUIT",
        "outputSpec": "The new hex value of the register after each operation (e.g., 0x08).",
        "files": [
            {
                "name": "main.c",
                "content": "#include <stdio.h>\n#include <stdint.h>\n#include <string.h>\n\nstatic uint8_t HW_REGISTER = 0x00;\n\nvoid process_command(const char* cmd, int bit_pos) {\n    // TODO: Implement bitwise operations on HW_REGISTER\n}\n\nint main() {\n    char cmd[20];\n    int bit;\n    while(scanf(\"%s %d\", cmd, &bit) == 2) {\n        process_command(cmd, bit);\n    }\n    return 0;\n}"
            }
        ],
        "testCases": [
            {
                "name": "Basic Sets",
                "stdin": "SET_BIT 0\nSET_BIT 1",
                "expectedOutput": "0x01\n0x03"
            }
        ]
    },
    {
        "id": "VISTEON-02",
        "topicId": "VISTEON_C",
        "title": "Q2: Array & Pointer Arithmetic",
        "difficulty": "Intermediate",
        "points": 120,
        "statement": "Write a program to reverse an array of N integers strictly using pointer arithmetic—do NOT use array indexing (`arr[i]`). Also, find the maximum element using pointers and swap it with the first element. The solution should be general to any array length strictly passed by reference.",
        "acceptance": [
            "Pointer arithmetic only for traversal",
            "Correct swapping logic",
            "No array index brackets allowed inside processor function"
        ],
        "deliverables": [
            "main.c"
        ],
        "inputSpec": "Array length N followed by N integers.",
        "outputSpec": "Reversed array separated by spaces, then maximum element value.",
        "files": [
            {
                "name": "main.c",
                "content": "#include <stdio.h>\n\nvoid process_array(int *arr, int len) {\n    // TODO: Implement reversal and max swap using pointers only\n}\n\nint main() {\n    int n;\n    if (scanf(\"%d\", &n) != 1) return 0;\n    int arr[100];\n    for (int i=0; i<n; i++) {\n        scanf(\"%d\", arr+i);\n    }\n    process_array(arr, n);\n    // TODO: Print reversed array\n    return 0;\n}"
            }
        ],
        "testCases": [
            {
                "name": "Short Array",
                "stdin": "4\n1 9 4 5",
                "expectedOutput": "9 4 1 5"
            }
        ]
    },
    {
        "id": "VISTEON-03",
        "topicId": "VISTEON_C",
        "title": "Q3: Structure Packing and Unions",
        "difficulty": "Advanced",
        "points": 150,
        "statement": "Sensors often transmit data in specific byte alignments. Define a packed structure containing: a 16-bit identifier, an 8-bit status flag, and a 32-bit floating point payload. Store this structure inside a Union that also contains an array of raw bytes (`uint8_t`). Read N raw bytes from input, populate the union, and extract the parsed fields.\nNote: Simulate `#pragma pack(1)` behavior if necessary using compiler attributes.",
        "acceptance": [
            "Memory packing achieved correctly",
            "Union based serialization applied",
            "Endienness awareness demonstrated (assume Little Endian)"
        ],
        "deliverables": [
            "main.c"
        ],
        "inputSpec": "7 bytes of space-separated hex values (e.g. 0A 00 FF 00 00 80 3F)",
        "outputSpec": "ID: <uint16>, Status: <uint8>, Payload: <float>",
        "files": [
            {
                "name": "main.c",
                "content": "#include <stdio.h>\n#include <stdint.h>\n\n// TODO: Define packed struct inside a union here\n\nint main() {\n    // TODO: read hex dump and parse into union member, then print\n    return 0;\n}"
            }
        ],
        "testCases": [
            {
                "name": "Dummy Input",
                "stdin": "01 00 02 00 00 80 3F",
                "expectedOutput": "ID: 1, Status: 2, Payload: 1.000000"
            }
        ]
    },
    {
        "id": "VISTEON-04",
        "topicId": "VISTEON_C",
        "title": "Q4: Function Pointers as Finite State Machines",
        "difficulty": "Advanced",
        "points": 200,
        "statement": "Implement an ECU ignition Finite State Machine (STATES: INIT, ACCESSORY, RUN, CRANK). Instead of a large switch-case, use an array of function pointers. Each function represents a state and returns the function pointer to the NEXT state based on external inputs (0 for IGN_OFF, 1 for KEY_IN, 2 for BTN_PRESS). Process a stream of inputs and print the state transitions.",
        "acceptance": [
            "Array of function pointers used",
            "No switch-case for state routing",
            "State encapsulation respected"
        ],
        "deliverables": [
            "main.c"
        ],
        "inputSpec": "List of integers representing events until -1.",
        "outputSpec": "Trace of states entered, e.g., \"Entered INIT\", \"Entered ACCESSORY\", etc.",
        "files": [
            {
                "name": "main.c",
                "content": "#include <stdio.h>\n\n// TODO: Define function pointer type and state functions\n\nint main() {\n    int event;\n    // TODO: Init state machine loop over events until -1\n    return 0;\n}"
            }
        ],
        "testCases": [
            {
                "name": "Engine Start Sequence",
                "stdin": "1 2 -1",
                "expectedOutput": "Entered INIT\nEntered ACCESSORY\nEntered RUN"
            }
        ]
    },
    {
        "id": "VISTEON-05",
        "topicId": "VISTEON_C",
        "title": "Q5: Bit Fields and Register Masking",
        "difficulty": "Advanced",
        "points": 150,
        "statement": "Define a 32-bit register strictly using a C bit-field structure. The register has: 2 bits for Mode, 5 bits for Prescaler, 1 bit for Enable, and 24 bits for Payload. Write a function that accepts this bit-field struct, converts it to a raw 32-bit integer, applies an external hardware mask via bitwise AND, and returns the modified struct.",
        "acceptance": [
            "Bit-fields cleanly defined without overflow",
            "Union mapping to uint32_t",
            "Mask correctly applied"
        ],
        "deliverables": [
            "main.c"
        ],
        "inputSpec": "Mode, Prescaler, Enable, Payload, and Mask (all as integers).",
        "outputSpec": "The resulting 32-bit hex value printed.",
        "files": [
            {
                "name": "main.c",
                "content": "#include <stdio.h>\n#include <stdint.h>\n\n// TODO: Define bitfield and union\n\nint main() {\n    // TODO: Process input, apply mask, print hex result\n    return 0;\n}"
            }
        ],
        "testCases": [
            {
                "name": "Mask Disable",
                "stdin": "3 15 1 1000 0xFFFFFFFC",
                "expectedOutput": "0x00003E0C"
            }
        ]
    }
];
