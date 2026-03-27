/**
 * LinAge2 NHANES Data Collection Form Controller
 * Modern, config-driven form management
 *
 * This work is licensed under the Creative Commons Attribution 4.0 International License (CC BY 4.0).
 * Derived from: Fung C, Vialle RA, Ahadi S, et al. (2025).
 * "Sex-Specific Clocks for Biological Age"
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC12019333/
 *
 * You are free to share and adapt this material for any purpose, even commercially,
 * under the following terms: You must give appropriate credit, provide a link to the license,
 * and indicate if changes were made.
 */

// Form field configuration - single source of truth
const formConfig = {
    demographics: {
        title: "Demographics & Basic Information",
        fields: [
            {
                id: 'seqn',
                type: 'text',
                label: 'Participant ID (SEQN)',
                required: true,
                pattern: '[0-9]+',
                min: 1,
                max: 99999,
                help: 'Enter a unique 4-5 digit participant number'
            },
            {
                id: 'gender',
                type: 'radio',
                label: 'Gender (RIAGENDR)',
                required: true,
                options: [
                    { value: 1, label: 'Male (1)' },
                    { value: 2, label: 'Female (2)' }
                ]
            },
            {
                id: 'age',
                type: 'text',
                label: 'Age in months (RIDAGEEX)',
                required: true,
                pattern: '[0-9]+',
                min: 240,
                max: 1020,
                help: 'Age range: 20-85 years (240-1020 months). Example: 30 years = 360 months'
            }
        ]
    },
    healthHistory: {
        title: "Health History Questionnaire",
        fields: [
            {
                id: 'bpq020',
                type: 'radio',
                label: 'Doctor told you have high blood pressure (BPQ020)',
                options: [
                    { value: 1, label: 'Yes (1)' },
                    { value: 2, label: 'No (2)' }
                ]
            },
            {
                id: 'diq010',
                type: 'radio',
                label: 'Doctor told you have diabetes (DIQ010)',
                options: [
                    { value: 1, label: 'Yes (1)' },
                    { value: 2, label: 'No (2)' },
                    { value: 3, label: 'Borderline (3)' }
                ]
            },
            {
                id: 'huq010',
                type: 'radio',
                label: 'General health condition (HUQ010)',
                options: [
                    { value: 1, label: 'Excellent (1)' },
                    { value: 2, label: 'Very good (2)' },
                    { value: 3, label: 'Good (3)' },
                    { value: 4, label: 'Fair (4)' },
                    { value: 5, label: 'Poor (5)' }
                ]
            },
            {
                id: 'huq020',
                type: 'radio',
                label: 'Health now compared with 1 year ago (HUQ020)',
                options: [
                    { value: 1, label: 'Better (1)' },
                    { value: 2, label: 'About the same (2)' },
                    { value: 3, label: 'Worse (3)' }
                ]
            },
            {
                id: 'huq050',
                type: 'text',
                label: 'Number of healthcare visits in past year (HUQ050)',
                required: false,
                pattern: '[0-9]+',
                min: 0,
                max: 76,
                help: 'Enter 0-76, or 77=Refused, 99=Don\'t know'
            },
            {
                id: 'huq070',
                type: 'radio',
                label: 'Overnight hospital patient in last year (HUQ070)',
                options: [
                    { value: 1, label: 'Yes (1)' },
                    { value: 2, label: 'No (2)' }
                ]
            },
            {
                id: 'kiq020',
                type: 'radio',
                label: 'Told had weak/failing kidneys (KIQ020)',
                options: [
                    { value: 1, label: 'Yes (1)' },
                    { value: 2, label: 'No (2)' }
                ]
            }
        ]
    },
    medicalConditions: {
        title: "Medical Conditions History (1=Yes, 2=No)",
        fields: [
            { id: 'mcq010', type: 'radio', label: 'Ever told had asthma (MCQ010)' },
            { id: 'mcq053', type: 'radio', label: 'Taking treatment for anemia past 3 months (MCQ053)' },
            { id: 'mcq160a', type: 'radio', label: 'Told had arthritis (MCQ160A)' },
            { id: 'mcq160b', type: 'radio', label: 'Told had congestive heart failure (MCQ160B)' },
            { id: 'mcq160c', type: 'radio', label: 'Told had coronary heart disease (MCQ160C)' },
            { id: 'mcq160d', type: 'radio', label: 'Told had angina (MCQ160D)' },
            { id: 'mcq160e', type: 'radio', label: 'Told had heart attack (MCQ160E)' },
            { id: 'mcq160f', type: 'radio', label: 'Told had stroke (MCQ160F)' },
            { id: 'mcq160g', type: 'radio', label: 'Told had emphysema (MCQ160G)' },
            { id: 'mcq160i', type: 'radio', label: 'Told had thyroid disease (MCQ160I)' },
            { id: 'mcq160j', type: 'radio', label: 'Told overweight (MCQ160J)' },
            { id: 'mcq160k', type: 'radio', label: 'Told had chronic bronchitis (MCQ160K)' },
            { id: 'mcq160l', type: 'radio', label: 'Told had liver condition (MCQ160L)' },
            { id: 'mcq220', type: 'radio', label: 'Told had cancer or malignancy (MCQ220)' }
        ].map(field => ({
            ...field,
            options: [
                { value: 1, label: 'Yes (1)' },
                { value: 2, label: 'No (2)' }
            ]
        }))
    },
    boneHealth: {
        title: "Bone Health (1=Yes, 2=No)",
        fields: [
            { id: 'osq010a', type: 'radio', label: 'Broken or fractured a hip (OSQ010A)' },
            { id: 'osq010b', type: 'radio', label: 'Broken or fractured a wrist (OSQ010B)' },
            { id: 'osq010c', type: 'radio', label: 'Broken or fractured spine (OSQ010C)' },
            { id: 'osq060', type: 'radio', label: 'Told had osteoporosis or brittle bones (OSQ060)' }
        ].map(field => ({
            ...field,
            options: [
                { value: 1, label: 'Yes (1)' },
                { value: 2, label: 'No (2)' }
            ]
        }))
    },
    physicalFunction: {
        title: "Physical Function",
        fields: [
            {
                id: 'pfq056',
                type: 'radio',
                label: 'Experience confusion/memory problems (PFQ056)',
                options: [
                    { value: 1, label: 'Yes (1)' },
                    { value: 2, label: 'No (2)' }
                ]
            }
        ]
    },
    physicalExam: {
        title: "Physical Examination",
        fields: [
            { id: 'bpxpls', type: 'number', label: '60-second pulse rate (BPXPLS)', unit: 'beats/min', min: 40, max: 140, step: 1, required: true },
            { id: 'bpxsar', type: 'number', label: 'Systolic blood pressure (BPXSAR)', unit: 'mmHg', min: 80, max: 200, step: 1, required: true },
            { id: 'bpxdar', type: 'number', label: 'Diastolic blood pressure (BPXDAR)', unit: 'mmHg', min: 40, max: 120, step: 1, required: true },
            { id: 'bmxbmi', type: 'number', label: 'Body Mass Index (BMXBMI)', unit: 'kg/m²', min: 15, max: 50, step: 0.1, required: true }
        ]
    },
    labUrinalysis: {
        title: "Laboratory Tests - Urine",
        fields: [
            { id: 'urxumasi', type: 'number', label: 'Albumin in urine (URXUMASI)', unit: 'mg/L', min: 0, max: 500, step: 0.1, required: true },
            { id: 'urxucrsi', type: 'number', label: 'Creatinine in urine (URXUCRSI)', unit: 'umol/L', min: 500, max: 30000, step: 1, required: true }
        ]
    },
    labIronNutrition: {
        title: "Laboratory Tests - Iron & Nutrition",
        fields: [
            { id: 'lbdirnsi', type: 'number', label: 'Iron (LBDIRNSI)', unit: 'umol/L', min: 3, max: 40, step: 0.1, required: true },
            { id: 'lbdtibsi', type: 'number', label: 'Total iron binding capacity (LBDTIBSI)', unit: 'umol/L', min: 30, max: 90, step: 0.1, required: true },
            { id: 'lbxpct', type: 'number', label: 'Transferrin saturation (LBXPCT)', unit: '%', min: 10, max: 80, step: 1, required: true },
            { id: 'lbdfersi', type: 'number', label: 'Ferritin (LBDFERSI)', unit: 'ug/L', min: 10, max: 1500, step: 1, required: true },
            { id: 'lbdfolsi', type: 'number', label: 'Folate serum (LBDFOLSI)', unit: 'nmol/L', min: 5, max: 100, step: 0.1, required: true },
            { id: 'lbdb12si', type: 'number', label: 'Vitamin B12 serum (LBDB12SI)', unit: 'pmol/L', min: 100, max: 1500, step: 1, required: true }
        ]
    },
    labLifestyle: {
        title: "Laboratory Tests - Lifestyle",
        fields: [
            { id: 'lbxcot', type: 'number', label: 'Cotinine (LBXCOT)', unit: 'ng/mL', min: 0, max: 3, step: 1, required: true, help: 'Smoking status: 0=Non-smoker, 1=Light, 2=Moderate, 3=Heavy' }
        ]
    },
    labCholesterol: {
        title: "Laboratory Tests - Cholesterol",
        fields: [
            { id: 'lbdtcsi', type: 'number', label: 'Total cholesterol (LBDTCSI)', unit: 'mmol/L', min: 2.5, max: 10, step: 0.01, required: true },
            { id: 'lbdhdlsi', type: 'number', label: 'HDL cholesterol (LBDHDLSI)', unit: 'mmol/L', min: 0.5, max: 3.5, step: 0.01, required: true }
        ]
    },
    labCBC: {
        title: "Complete Blood Count",
        fields: [
            { id: 'lbxwbcsi', type: 'number', label: 'White blood cell count (LBXWBCSI)', unit: '1000 cells/uL', min: 3, max: 15, step: 0.1, required: true },
            { id: 'lbxlypct', type: 'number', label: 'Lymphocyte percentage (LBXLYPCT)', unit: '%', min: 15, max: 50, step: 0.1, required: true },
            { id: 'lbxmopct', type: 'number', label: 'Monocyte percentage (LBXMOPCT)', unit: '%', min: 2, max: 15, step: 0.1, required: true },
            { id: 'lbxnepct', type: 'number', label: 'Neutrophils percentage (LBXNEPCT)', unit: '%', min: 40, max: 80, step: 0.1, required: true },
            { id: 'lbxeopct', type: 'number', label: 'Eosinophils percentage (LBXEOPCT)', unit: '%', min: 0, max: 10, step: 0.1, required: true },
            { id: 'lbxbapct', type: 'number', label: 'Basophils percentage (LBXBAPCT)', unit: '%', min: 0, max: 3, step: 0.1, required: true },
            { id: 'lbdlymno', type: 'number', label: 'Lymphocyte count (LBDLYMNO)', unit: '1000 cells/uL', min: 1, max: 5, step: 0.1, required: true },
            { id: 'lbdmono', type: 'number', label: 'Monocyte count (LBDMONO)', unit: '1000 cells/uL', min: 0.2, max: 1.5, step: 0.1, required: true },
            { id: 'lbdneno', type: 'number', label: 'Neutrophils count (LBDNENO)', unit: '1000 cells/uL', min: 2, max: 10, step: 0.1, required: true },
            { id: 'lbdeono', type: 'number', label: 'Eosinophils count (LBDEONO)', unit: '1000 cells/uL', min: 0, max: 1, step: 0.01, required: true },
            { id: 'lbdbano', type: 'number', label: 'Basophils count (LBDBANO)', unit: '1000 cells/uL', min: 0, max: 0.3, step: 0.01, required: true },
            { id: 'lbxrbcsi', type: 'number', label: 'Red blood cell count (LBXRBCSI)', unit: 'million cells/uL', min: 3.5, max: 6.5, step: 0.01, required: true },
            { id: 'lbxhgb', type: 'number', label: 'Hemoglobin (LBXHGB)', unit: 'g/dL', min: 10, max: 20, step: 0.1, required: true },
            { id: 'lbxhct', type: 'number', label: 'Hematocrit (LBXHCT)', unit: '%', min: 30, max: 60, step: 0.1, required: true },
            { id: 'lbxmcvsi', type: 'number', label: 'Mean cell volume (LBXMCVSI)', unit: 'fL', min: 70, max: 110, step: 0.1, required: true },
            { id: 'lbxmchsi', type: 'number', label: 'Mean cell hemoglobin (LBXMCHSI)', unit: 'pg', min: 25, max: 35, step: 0.1, required: true },
            { id: 'lbxmc', type: 'number', label: 'Mean cell hemoglobin concentration (LBXMC)', unit: 'g/dL', min: 30, max: 37, step: 0.1, required: true },
            { id: 'lbxrdw', type: 'number', label: 'Red cell distribution width (LBXRDW)', unit: '%', min: 11, max: 18, step: 0.1, required: true },
            { id: 'lbxpltsi', type: 'number', label: 'Platelet count (LBXPLTSI)', unit: '1000 cells/uL', min: 150, max: 450, step: 1, required: true },
            { id: 'lbxmpsi', type: 'number', label: 'Mean platelet volume (LBXMPSI)', unit: 'fL', min: 7, max: 12, step: 0.1, required: true }
        ]
    },
    labOtherMarkers: {
        title: "Other Health Markers",
        fields: [
            { id: 'lbxcrp', type: 'number', label: 'C-reactive protein (LBXCRP)', unit: 'mg/dL', min: 0.1, max: 10, step: 0.1, required: true },
            { id: 'lbxgh', type: 'number', label: 'Glycohemoglobin (LBXGH)', unit: '%', min: 4, max: 15, step: 0.1, required: true },
            { id: 'ssbnp', type: 'number', label: 'NT-proBNP (SSBNP)', unit: 'pg/ml', min: 10, max: 5000, step: 1, required: true }
        ]
    },
    labMetabolicPanel: {
        title: "Comprehensive Metabolic Panel",
        fields: [
            { id: 'lbdsalsi', type: 'number', label: 'Albumin (LBDSALSI)', unit: 'g/L', min: 30, max: 55, step: 1, required: true },
            { id: 'lbxsatsi', type: 'number', label: 'ALT (LBXSATSI)', unit: 'U/L', min: 5, max: 100, step: 1, required: true },
            { id: 'lbxsassi', type: 'number', label: 'AST (LBXSASSI)', unit: 'U/L', min: 5, max: 100, step: 1, required: true },
            { id: 'lbxsapsi', type: 'number', label: 'Alkaline phosphatase (LBXSAPSI)', unit: 'IU/L', min: 30, max: 150, step: 1, required: true },
            { id: 'lbdsbusi', type: 'number', label: 'Blood urea nitrogen (LBDSBUSI)', unit: 'mmol/L', min: 2, max: 15, step: 0.1, required: true },
            { id: 'lbdscasi', type: 'number', label: 'Calcium total (LBDSCASI)', unit: 'mmol/L', min: 2, max: 3, step: 0.1, required: true },
            { id: 'lbxsc3si', type: 'number', label: 'Bicarbonate (LBXSC3SI)', unit: 'mmol/L', min: 20, max: 32, step: 1, required: true },
            { id: 'lbdsglsi', type: 'number', label: 'Glucose (LBDSGLSI)', unit: 'mmol/L', min: 3.5, max: 20, step: 0.1, required: true },
            { id: 'lbxsldsi', type: 'number', label: 'Lactate dehydrogenase (LBXSLDSI)', unit: 'U/L', min: 100, max: 300, step: 1, required: true },
            { id: 'lbdsphsi', type: 'number', label: 'Phosphorus (LBDSPHSI)', unit: 'mmol/L', min: 0.8, max: 1.8, step: 0.1, required: true },
            { id: 'lbdstbsi', type: 'number', label: 'Bilirubin total (LBDSTBSI)', unit: 'umol/L', min: 5, max: 30, step: 1, required: true },
            { id: 'lbdstpsi', type: 'number', label: 'Protein total (LBDSTPSI)', unit: 'g/L', min: 60, max: 85, step: 1, required: true },
            { id: 'lbdstrsi', type: 'number', label: 'Triglycerides (LBDSTRSI)', unit: 'mmol/L', min: 0.5, max: 5, step: 0.1, required: true },
            { id: 'lbdsuasi', type: 'number', label: 'Uric acid (LBDSUASI)', unit: 'umol/L', min: 150, max: 600, step: 1, required: true },
            { id: 'lbdscrsi', type: 'number', label: 'Creatinine (LBDSCRSI)', unit: 'umol/L', min: 40, max: 200, step: 1, required: true },
            { id: 'lbxsnasi', type: 'number', label: 'Sodium (LBXSNASI)', unit: 'mmol/L', min: 130, max: 150, step: 1, required: true },
            { id: 'lbxsksi', type: 'number', label: 'Potassium (LBXSKSI)', unit: 'mmol/L', min: 3.0, max: 5.5, step: 0.1, required: true },
            { id: 'lbxsclsi', type: 'number', label: 'Chloride (LBXSCLSI)', unit: 'mmol/L', min: 95, max: 110, step: 1, required: true },
            { id: 'lbdsgbsi', type: 'number', label: 'Globulin (LBDSGBSI)', unit: 'g/L', min: 20, max: 40, step: 1, required: true }
        ]
    }
};

// Example values (from paul.csv)
const exampleValues = {
    seqn: "19763",
    gender: "1",
    age: "720",
    bpq020: "2",
    diq010: "2",
    huq010: "2",
    huq020: "2",
    huq050: "2",
    huq070: "1",
    kiq020: "2",
    mcq010: "2",
    mcq053: "2",
    mcq160a: "2",
    mcq160b: "2",
    mcq160c: "2",
    mcq160d: "2",
    mcq160e: "2",
    mcq160f: "2",
    mcq160g: "2",
    mcq160i: "2",
    mcq160j: "2",
    mcq160k: "2",
    mcq160l: "2",
    mcq220: "2",
    osq010a: "2",
    osq010b: "2",
    osq010c: "2",
    osq060: "2",
    pfq056: "2",
    bpxpls: "60",
    bpxsar: "113",
    bpxdar: "61",
    bmxbmi: "29",
    urxumasi: "1",
    urxucrsi: "3000",
    lbdirnsi: "9",
    lbdtibsi: "50",
    lbxpct: "20",
    lbdfersi: "300",
    lbdfolsi: "20",
    lbdb12si: "500",
    lbxcot: "0",
    lbdtcsi: "5.18",
    lbdhdlsi: "1.29",
    lbxwbcsi: "6.4",
    lbxlypct: "30",
    lbxmopct: "7",
    lbxnepct: "60",
    lbxeopct: "2",
    lbxbapct: "1",
    lbdlymno: "1.9",
    lbdmono: "0.5",
    lbdneno: "4.2",
    lbdeono: "0.1",
    lbdbano: "0.1",
    lbxrbcsi: "4.74",
    lbxhgb: "14.5",
    lbxhct: "43.9",
    lbxmcvsi: "93",
    lbxmchsi: "30.6",
    lbxmc: "33",
    lbxrdw: "12.6",
    lbxpltsi: "261",
    lbxmpsi: "8.5",
    lbxcrp: "0.3",
    lbxgh: "5.5",
    ssbnp: "100",
    lbdsalsi: "42",
    lbxsatsi: "25",
    lbxsassi: "23",
    lbxsapsi: "75",
    lbdsbusi: "5",
    lbdscasi: "2.4",
    lbxsc3si: "24",
    lbdsglsi: "5.5",
    lbxsldsi: "180",
    lbdsphsi: "1.2",
    lbdstbsi: "12",
    lbdstpsi: "72",
    lbdstrsi: "1.5",
    lbdsuasi: "300",
    lbdscrsi: "80",
    lbxsnasi: "140",
    lbxsksi: "4",
    lbxsclsi: "102",
    lbdsgbsi: "30"
};

// Form Controller Class
class NHANESFormController {
    constructor() {
        this.form = null;
        this.exampleValuesLoaded = false;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.form = document.getElementById('nhanesForm');
            this.buildForm();
            this.attachEventListeners();
            this.loadExampleValues();
        });
    }

    buildForm() {
        Object.entries(formConfig).forEach(([sectionKey, section]) => {
            const sectionElement = this.createSection(section);
            this.form.appendChild(sectionElement);
        });

        // Add button group
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        buttonGroup.innerHTML = `
            <button type="button" id="validateBtn">Validate Form</button>
            <button type="button" id="generateBtn">Generate CSV</button>
            <button type="button" id="downloadBtn">Download CSV</button>
            <button type="button" id="calculateBtn" class="calculate-btn">Calculate Biological Age</button>
        `;
        this.form.appendChild(buttonGroup);
    }

    createSection(section) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'form-section';

        const title = document.createElement('h2');
        title.textContent = section.title;
        sectionDiv.appendChild(title);

        section.fields.forEach(field => {
            const fieldGroup = this.createField(field);
            sectionDiv.appendChild(fieldGroup);
        });

        return sectionDiv;
    }

    createField(field) {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.setAttribute('for', field.id);
        label.innerHTML = `${field.label}${field.required ? ' <span class="required">*</span>' : ''}`;

        if (field.type === 'radio') {
            const radioGroup = document.createElement('div');
            radioGroup.className = 'radio-group';

            field.options.forEach(option => {
                const radioLabel = document.createElement('label');
                const radio = document.createElement('input');
                radio.type = 'radio';
                radio.name = field.id;
                radio.value = option.value;
                if (field.required) radio.required = true;

                radioLabel.appendChild(radio);
                radioLabel.appendChild(document.createTextNode(` ${option.label}`));
                radioGroup.appendChild(radioLabel);
            });

            formGroup.appendChild(label);
            formGroup.appendChild(radioGroup);
        } else {
            const input = document.createElement('input');
            input.type = field.type;
            input.id = field.id;
            input.name = field.id;

            if (field.min !== undefined) input.min = field.min;
            if (field.max !== undefined) input.max = field.max;
            if (field.step !== undefined) input.step = field.step;
            if (field.required) input.required = true;

            formGroup.appendChild(label);

            // Wrap input and unit in a container for grid layout
            const inputContainer = document.createElement('div');
            inputContainer.className = 'input-container';
            inputContainer.appendChild(input);

            if (field.unit) {
                const unitSpan = document.createElement('span');
                unitSpan.className = 'unit-label';
                unitSpan.textContent = field.unit;
                inputContainer.appendChild(unitSpan);
            }

            formGroup.appendChild(inputContainer);
        }

        if (field.help) {
            const helpText = document.createElement('div');
            helpText.className = 'help-text';
            helpText.textContent = field.help;
            formGroup.appendChild(helpText);
        }

        return formGroup;
    }

    attachEventListeners() {
        document.getElementById('toggleExample').addEventListener('click', () => this.toggleExampleValues());
        document.getElementById('validateBtn').addEventListener('click', () => this.validateForm());
        document.getElementById('generateBtn').addEventListener('click', () => this.generateCSV());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadCSV());
        document.getElementById('calculateBtn').addEventListener('click', () => this.calculateBioAge());
    }

    async calculateBioAge() {
        // Automatically generate CSV first (silently)
        const csvGenerated = this.generateCSV(true);
        if (!csvGenerated) {
            // Validation failed, generateCSV already showed the error
            return;
        }

        const calculateBtn = document.getElementById('calculateBtn');
        const resultSection = document.getElementById('linage2Result');

        // Show loading state
        calculateBtn.disabled = true;
        calculateBtn.textContent = 'Calculating...';
        resultSection.classList.add('loading', 'visible');

        try {
            // Call the global function from linage2_browser.js
            await window.computeLinAge2();
            resultSection.classList.remove('loading');

            // Scroll to results
            resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } catch (err) {
            console.error('Calculate error:', err);
            alert(`Error calculating biological age: ${err.message}`);
            resultSection.classList.remove('loading', 'visible');
        } finally {
            calculateBtn.disabled = false;
            calculateBtn.textContent = 'Calculate Biological Age';
        }
    }

    loadExampleValues() {
        Object.entries(exampleValues).forEach(([key, value]) => {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) {
                if (input.type === 'radio') {
                    const radio = document.querySelector(`[name="${key}"][value="${value}"]`);
                    if (radio) radio.checked = true;
                } else {
                    input.value = value;
                }
            }
        });
        this.exampleValuesLoaded = true;
        document.getElementById('toggleExample').textContent = 'Clear Example Values';
        document.getElementById('toggleExample').classList.add('clear');
    }

    clearForm() {
        this.form.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
            input.value = '';
        });
        this.form.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = false;
        });
    }

    toggleExampleValues() {
        const button = document.getElementById('toggleExample');

        if (this.exampleValuesLoaded) {
            this.clearForm();
            button.textContent = 'Load Example Values';
            button.classList.remove('clear');
            this.exampleValuesLoaded = false;
        } else {
            this.loadExampleValues();
        }
    }

    validateForm(silent = false) {
        const requiredFields = this.form.querySelectorAll('[required]');
        let isValid = true;
        const errors = [];

        requiredFields.forEach(field => {
            if (field.type === 'radio') {
                const radioGroup = document.querySelectorAll(`[name="${field.name}"]`);
                const isChecked = Array.from(radioGroup).some(radio => radio.checked);
                if (!isChecked) {
                    isValid = false;
                    errors.push(field.name);
                }
            } else if (!field.value) {
                isValid = false;
                field.classList.add('field-error');
                errors.push(field.name);
            } else {
                field.classList.remove('field-error');

                // Custom validation for text-type numeric fields
                if (field.name === 'age') {
                    const ageValue = parseInt(field.value, 10);
                    if (isNaN(ageValue) || ageValue < 240 || ageValue > 1020) {
                        isValid = false;
                        field.classList.add('field-error');
                        errors.push('age (must be 240-1020 months)');
                    }
                }
                if (field.name === 'seqn') {
                    const seqnValue = parseInt(field.value, 10);
                    if (isNaN(seqnValue) || seqnValue < 1 || seqnValue > 99999) {
                        isValid = false;
                        field.classList.add('field-error');
                        errors.push('seqn (must be 1-99999)');
                    }
                }
                if (field.name === 'huq050' && field.value) {
                    const huq050Value = parseInt(field.value, 10);
                    if (isNaN(huq050Value) || huq050Value < 0 || huq050Value > 99) {
                        isValid = false;
                        field.classList.add('field-error');
                        errors.push('huq050 (must be 0-99)');
                    }
                }
            }
        });

        if (!silent) {
            if (!isValid) {
                alert(`Please complete all required fields. Missing: ${errors.join(', ')}`);
            }
        } else if (!isValid) {
            // In silent mode, still alert for errors
            alert(`Please complete all required fields. Missing: ${errors.join(', ')}`);
        }

        return isValid;
    }

    generateCSV(silent = false) {
        if (!this.validateForm(silent)) return false;

        const formData = new FormData(this.form);
        const columns = this.getColumnOrder();

        // Map CSV column names to form field names
        const fieldNameMap = {
            'SEQN': 'seqn',
            'RIAGENDR': 'gender',
            'RIDAGEEX': 'age'
        };

        let csvContent = columns.join(',') + '\n';
        const dataRow = columns.map(col => {
            // Check if there's a mapping for this column, otherwise use lowercase
            const fieldName = fieldNameMap[col] || col.toLowerCase();
            const value = formData.get(fieldName) || '';
            return value;
        });
        csvContent += dataRow.join(',');

        document.getElementById('csvOutput').value = csvContent;
        document.getElementById('output').classList.add('visible');

        if (!silent) {
            // Scroll to output
            document.getElementById('output').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        return true;
    }

    downloadCSV() {
        const csvContent = document.getElementById('csvOutput').value;
        if (!csvContent) {
            alert('Please generate CSV first');
            return;
        }

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nhanes_user_data.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    getColumnOrder() {
        return [
            'SEQN', 'RIAGENDR', 'RIDAGEEX', 'BPQ020', 'DIQ010', 'HUQ010', 'HUQ020', 'HUQ050', 'HUQ070',
            'KIQ020', 'MCQ010', 'MCQ053', 'MCQ160A', 'MCQ160B', 'MCQ160C', 'MCQ160D', 'MCQ160E', 'MCQ160F',
            'MCQ160G', 'MCQ160I', 'MCQ160J', 'MCQ160K', 'MCQ160L', 'MCQ220', 'OSQ010A', 'OSQ010B', 'OSQ010C',
            'OSQ060', 'PFQ056', 'BPXPLS', 'BPXSAR', 'BPXDAR', 'BMXBMI', 'URXUMASI', 'URXUCRSI', 'LBDIRNSI',
            'LBDTIBSI', 'LBXPCT', 'LBDFERSI', 'LBDFOLSI', 'LBDB12SI', 'LBXCOT', 'LBDTCSI', 'LBDHDLSI',
            'LBXWBCSI', 'LBXLYPCT', 'LBXMOPCT', 'LBXNEPCT', 'LBXEOPCT', 'LBXBAPCT', 'LBDLYMNO', 'LBDMONO',
            'LBDNENO', 'LBDEONO', 'LBDBANO', 'LBXRBCSI', 'LBXHGB', 'LBXHCT', 'LBXMCVSI', 'LBXMCHSI', 'LBXMC',
            'LBXRDW', 'LBXPLTSI', 'LBXMPSI', 'LBXCRP', 'LBXGH', 'SSBNP', 'LBDSALSI', 'LBXSATSI', 'LBXSASSI',
            'LBXSAPSI', 'LBDSBUSI', 'LBDSCASI', 'LBXSC3SI', 'LBDSGLSI', 'LBXSLDSI', 'LBDSPHSI', 'LBDSTBSI',
            'LBDSTPSI', 'LBDSTRSI', 'LBDSUASI', 'LBDSCRSI', 'LBXSNASI', 'LBXSKSI', 'LBXSCLSI', 'LBDSGBSI'
        ];
    }
}

// Initialize the form controller
new NHANESFormController();
