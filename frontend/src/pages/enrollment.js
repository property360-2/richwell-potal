import '../style.css';
import { api, endpoints } from '../api.js';
import { showToast, validateEmail, validatePhone, validateRequired } from '../utils.js';

// State management
const state = {
  currentStep: 1,
  totalSteps: 5,
  programs: [],
  enrollmentEnabled: true,
  formData: {
    first_name: '',
    last_name: '',
    email: '',
    birthdate: '',
    address: '',
    contact_number: '',
    program_id: '',
    monthly_commitment: 5000,
    is_transferee: false,
    previous_school: '',
    previous_course: ''
  },
  documents: []
};

// Initialize the app
async function init() {
  await checkEnrollmentStatus();
  await loadPrograms();
  render();
}

// Check if enrollment is enabled
async function checkEnrollmentStatus() {
  try {
    const response = await fetch('/api/v1/admissions/system/enrollment-status/');
    if (response.ok) {
      const data = await response.json();
      state.enrollmentEnabled = data.enrollment_enabled !== false;
    } else {
      // API returned error, default to enabled for development
      state.enrollmentEnabled = true;
    }
  } catch (error) {
    console.log('Using default enrollment status (enabled)');
    // Default to enabled when API is not available
    state.enrollmentEnabled = true;
  }
}

// Mock programs for development (fallback)
const MOCK_PROGRAMS = [
  { id: '1', code: 'BSIT', name: 'Bachelor of Science in Information Technology', tuition_per_semester: 30000 },
  { id: '2', code: 'BSCS', name: 'Bachelor of Science in Computer Science', tuition_per_semester: 32000 },
  { id: '3', code: 'BSBA', name: 'Bachelor of Science in Business Administration', tuition_per_semester: 28000 },
  { id: '4', code: 'BSA', name: 'Bachelor of Science in Accountancy', tuition_per_semester: 35000 },
  { id: '5', code: 'BSED', name: 'Bachelor of Secondary Education', tuition_per_semester: 25000 },
  { id: '6', code: 'BSHM', name: 'Bachelor of Science in Hospitality Management', tuition_per_semester: 28000 }
];

// Load available programs
async function loadPrograms() {
  try {
    const response = await fetch('/api/v1/admissions/programs/');
    if (response.ok) {
      const data = await response.json();
      const programs = data.results || data || [];
      // Use mock data if API returns empty
      state.programs = programs.length > 0 ? programs : MOCK_PROGRAMS;
    } else {
      // API returned error, use mock data
      state.programs = MOCK_PROGRAMS;
    }
  } catch (error) {
    console.log('Could not load programs, using defaults');
    state.programs = MOCK_PROGRAMS;
  }
}

// Render the app
function render() {
  const app = document.getElementById('app');

  if (!state.enrollmentEnabled) {
    app.innerHTML = renderDisabledState();
    return;
  }

  app.innerHTML = `
    <div class="min-h-screen py-8 px-4">
      <!-- Header -->
      <div class="text-center mb-8">
        <img src="/logo.jpg" alt="Richwell Colleges" class="w-16 h-16 rounded-xl object-cover mb-4 shadow-lg">
        <h1 class="text-3xl font-bold gradient-text">Richwell Colleges</h1>
        <p class="text-gray-600 mt-2">Student Enrollment Portal</p>
      </div>
      
      <!-- Progress Steps -->
      ${renderProgressSteps()}
      
      <!-- Form Card -->
      <div class="max-w-2xl mx-auto">
        <div class="card">
          ${renderCurrentStep()}
        </div>
        
        <!-- Navigation Buttons -->
        <div class="flex justify-between mt-6">
          ${state.currentStep > 1 ? `
            <button onclick="prevStep()" class="btn-secondary flex items-center gap-2">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              Previous
            </button>
          ` : '<div></div>'}
          
          ${state.currentStep < state.totalSteps ? `
            <button onclick="nextStep()" class="btn-primary flex items-center gap-2">
              Next Step
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
            </button>
          ` : `
            <button onclick="submitEnrollment()" class="btn-primary flex items-center gap-2" id="submit-btn">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
              Submit Enrollment
            </button>
          `}
        </div>
      </div>
      
      <!-- Footer -->
      <div class="text-center mt-12 text-gray-500 text-sm">
        <p>Already have an account? <a href="/login.html" class="text-blue-600 hover:underline font-medium">Login here</a></p>
      </div>
    </div>
  `;

  attachEventListeners();
}

// Render progress steps
function renderProgressSteps() {
  const steps = ['Personal Info', 'Program', 'Documents', 'Payment', 'Confirm'];

  return `
    <div class="max-w-2xl mx-auto mb-8">
      <div class="flex items-center justify-between">
        ${steps.map((step, index) => `
          <div class="flex flex-col items-center">
            <div class="step-indicator ${index + 1 < state.currentStep ? 'completed' : index + 1 === state.currentStep ? 'active' : 'pending'}">
              ${index + 1 < state.currentStep ? '✓' : index + 1}
            </div>
            <span class="text-xs mt-2 font-medium ${index + 1 === state.currentStep ? 'text-blue-600' : 'text-gray-500'}">${step}</span>
          </div>
          ${index < steps.length - 1 ? `
            <div class="flex-1 h-1 mx-2 rounded-full ${index + 1 < state.currentStep ? 'bg-green-500' : 'bg-gray-200'}"></div>
          ` : ''}
        `).join('')}
      </div>
    </div>
  `;
}

// Render current step content
function renderCurrentStep() {
  switch (state.currentStep) {
    case 1:
      return renderStep1();
    case 2:
      return renderStep2();
    case 3:
      return renderStep3();
    case 4:
      return renderStep4();
    case 5:
      return renderStep5();
    default:
      return '';
  }
}

// Step 1: Personal Information
function renderStep1() {
  return `
    <div class="fade-in">
      <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        Personal Information
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="form-label">First Name <span class="text-red-500">*</span></label>
          <input type="text" id="first_name" class="form-input" placeholder="Juan" value="${state.formData.first_name}" required>
        </div>
        <div>
          <label class="form-label">Last Name <span class="text-red-500">*</span></label>
          <input type="text" id="last_name" class="form-input" placeholder="Dela Cruz" value="${state.formData.last_name}" required>
        </div>
      </div>
      
      <div class="mt-4">
        <label class="form-label">Email Address <span class="text-red-500">*</span></label>
        <input type="email" id="email" class="form-input" placeholder="juan@example.com" value="${state.formData.email}" required onblur="checkEmailAvailabilityAuto()">
        <p id="email-status" class="text-sm mt-1"></p>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <label class="form-label">Birthdate <span class="text-red-500">*</span></label>
          <input type="date" id="birthdate" class="form-input" value="${state.formData.birthdate}" required>
        </div>
        <div>
          <label class="form-label">Contact Number <span class="text-red-500">*</span></label>
          <input type="tel" id="contact_number" class="form-input" placeholder="09171234567" value="${state.formData.contact_number}" required>
        </div>
      </div>
      
      <div class="mt-4">
        <label class="form-label">Complete Address <span class="text-red-500">*</span></label>
        <textarea id="address" class="form-input" rows="3" placeholder="123 Main St, Barangay, City, Province">${state.formData.address}</textarea>
      </div>
    </div>
  `;
}

// Step 2: Program Selection
function renderStep2() {
  return `
    <div class="fade-in">
      <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
        </svg>
        Select Your Program
      </h2>
      
      <div class="space-y-3">
        ${state.programs.map(program => `
          <label class="flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all hover:border-blue-300 ${state.formData.program_id === program.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}">
            <input type="radio" name="program" value="${program.id}" ${state.formData.program_id === program.id ? 'checked' : ''} class="w-5 h-5 text-blue-600">
            <div class="ml-4 flex-1">
              <div class="font-semibold text-gray-800">${program.name}</div>
              <div class="text-sm text-gray-500">${program.code}</div>
            </div>
          </label>
        `).join('')}
      </div>
    </div>
  `;
}

// Step 3: Documents
function renderStep3() {
  return `
    <div class="fade-in">
      <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
        Upload Documents
      </h2>
      
      <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p class="text-sm text-blue-700">
          <strong>Required Documents:</strong> Valid ID, Form 138/TOR, Birth Certificate, Good Moral Certificate
        </p>
      </div>
      
      <div class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors cursor-pointer" id="drop-zone">
        <input type="file" id="file-input" multiple accept=".pdf,.jpg,.jpeg,.png" class="hidden">
        <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
        </svg>
        <p class="text-gray-600 font-medium">Drop files here or click to upload</p>
        <p class="text-sm text-gray-400 mt-1">PDF, JPG, PNG up to 10MB each</p>
      </div>
      
      <!-- Uploaded files -->
      <div id="file-list" class="mt-4 space-y-2">
        ${state.documents.map((file, index) => `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <span class="text-sm font-medium text-gray-700">${file.name}</span>
            </div>
            <button onclick="removeFile(${index})" class="text-red-500 hover:text-red-700">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// Step 4: Payment Commitment
function renderStep4() {
  return `
    <div class="fade-in">
      <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        Payment Commitment
      </h2>
      
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 mb-6 border border-blue-100">
        <p class="text-sm text-gray-600">Set your monthly payment commitment. The semester is divided into 6 monthly payments, this indicates how much you can pay for every month</p>
      </div>
      
      <div class="mb-6">
        <label class="form-label">Monthly Commitment Amount (₱) <span class="text-red-500">*</span></label>
        <input type="number" id="monthly_commitment" class="form-input text-2xl font-bold text-center" value="${state.formData.monthly_commitment}" min="0" step="100">
        <p class="text-sm text-gray-500 mt-2 text-center">Enter your monthly payment commitment</p>
      </div>
      
      <!-- 6 Month Preview -->
      <div class="grid grid-cols-6 gap-2 mb-6">
        ${[1, 2, 3, 4, 5, 6].map(month => `
          <div class="text-center p-3 bg-gray-50 rounded-lg">
            <div class="text-xs text-gray-500">Month ${month}</div>
            <div class="text-sm font-bold text-gray-700" data-month-preview>₱${state.formData.monthly_commitment.toLocaleString()}</div>
          </div>
        `).join('')}
      </div>

      <div class="border-t pt-4">
        <div class="flex justify-between text-lg font-bold">
          <span>Total Semester Payment:</span>
          <span class="text-blue-600" id="total-semester-payment">₱${(state.formData.monthly_commitment * 6).toLocaleString()}</span>
        </div>
      </div>
      
      <!-- Transferee Section -->
      <div class="mt-6 pt-6 border-t">
        <label class="flex items-center cursor-pointer">
          <input type="checkbox" id="is_transferee" ${state.formData.is_transferee ? 'checked' : ''} class="w-5 h-5 text-blue-600 rounded">
          <span class="ml-3 font-medium text-gray-700">I am a transferee from another school</span>
        </label>
        
        <div id="transferee-fields" class="${state.formData.is_transferee ? '' : 'hidden'} mt-4 pl-8 space-y-4">
          <div>
            <label class="form-label">Previous School</label>
            <input type="text" id="previous_school" class="form-input" placeholder="Name of previous school" value="${state.formData.previous_school}">
          </div>
          <div>
            <label class="form-label">Previous Course</label>
            <input type="text" id="previous_course" class="form-input" placeholder="Course taken" value="${state.formData.previous_course}">
          </div>
        </div>
      </div>
    </div>
  `;
}

// Step 5: Confirmation
function renderStep5() {
  const selectedProgram = state.programs.find(p => p.id === state.formData.program_id);

  return `
    <div class="fade-in">
      <h2 class="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Review Your Application
      </h2>
      
      <div class="space-y-4">
        <!-- Personal Info -->
        <div class="bg-gray-50 rounded-xl p-4">
          <h3 class="font-semibold text-gray-700 mb-3">Personal Information</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div><span class="text-gray-500">Name:</span> <span class="font-medium">${state.formData.first_name} ${state.formData.last_name}</span></div>
            <div><span class="text-gray-500">Email:</span> <span class="font-medium">${state.formData.email}</span></div>
            <div><span class="text-gray-500">Birthdate:</span> <span class="font-medium">${state.formData.birthdate}</span></div>
            <div><span class="text-gray-500">Contact:</span> <span class="font-medium">${state.formData.contact_number}</span></div>
            <div class="col-span-2"><span class="text-gray-500">Address:</span> <span class="font-medium">${state.formData.address}</span></div>
          </div>
        </div>
        
        <!-- Program -->
        <div class="bg-gray-50 rounded-xl p-4">
          <h3 class="font-semibold text-gray-700 mb-3">Selected Program</h3>
          <p class="font-medium text-blue-600">${selectedProgram?.name || 'Not selected'}</p>
          <p class="text-sm text-gray-500">${selectedProgram?.code || ''}</p>
        </div>
        
        <!-- Documents -->
        <div class="bg-gray-50 rounded-xl p-4">
          <h3 class="font-semibold text-gray-700 mb-3">Documents Uploaded</h3>
          <p class="text-sm">${state.documents.length} document(s) uploaded</p>
        </div>
        
        <!-- Payment -->
        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
          <h3 class="font-semibold text-gray-700 mb-3">Payment Commitment</h3>
          <div class="flex justify-between items-center">
            <span>Monthly Payment:</span>
            <span class="text-2xl font-bold text-blue-600">₱${state.formData.monthly_commitment.toLocaleString()}</span>
          </div>
          <div class="flex justify-between items-center mt-2 pt-2 border-t border-blue-200">
            <span>Total (6 months):</span>
            <span class="font-bold">₱${(state.formData.monthly_commitment * 6).toLocaleString()}</span>
          </div>
        </div>
        
        ${state.formData.is_transferee ? `
          <div class="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <h3 class="font-semibold text-yellow-700 mb-3">Transferee Information</h3>
            <p class="text-sm"><span class="text-gray-500">Previous School:</span> ${state.formData.previous_school}</p>
            <p class="text-sm"><span class="text-gray-500">Previous Course:</span> ${state.formData.previous_course}</p>
          </div>
        ` : ''}
      </div>
      
      <div class="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl">
        <label class="flex items-start cursor-pointer">
          <input type="checkbox" id="agree-terms" class="w-5 h-5 text-green-600 rounded mt-0.5">
          <span class="ml-3 text-sm text-gray-600">I confirm that all information provided is accurate and I agree to the enrollment terms and conditions of Richwell Colleges.</span>
        </label>
      </div>
    </div>
  `;
}

// Render disabled state
function renderDisabledState() {
  return `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="card max-w-md text-center">
        <div class="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h2 class="text-xl font-bold text-gray-800 mb-2">Enrollment Closed</h2>
        <p class="text-gray-600 mb-6">Online enrollment is currently not available. Please check back later or contact the registrar's office.</p>
        <a href="/login.html" class="btn-secondary inline-block">Go to Login</a>
      </div>
    </div>
  `;
}

// Attach event listeners
function attachEventListeners() {
  // Form inputs
  document.querySelectorAll('input, textarea, select').forEach(input => {
    input.addEventListener('change', handleInputChange);
    input.addEventListener('input', handleInputChange);
  });

  // Program selection
  document.querySelectorAll('input[name="program"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.formData.program_id = e.target.value;
      render();
    });
  });

  // File upload
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-blue-400', 'bg-blue-50');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-blue-400', 'bg-blue-50');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-blue-400', 'bg-blue-50');
      handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
  }

  // Transferee checkbox
  const transfereeCheckbox = document.getElementById('is_transferee');
  if (transfereeCheckbox) {
    transfereeCheckbox.addEventListener('change', (e) => {
      state.formData.is_transferee = e.target.checked;
      const fields = document.getElementById('transferee-fields');
      if (fields) {
        fields.classList.toggle('hidden', !e.target.checked);
      }
    });
  }
}

// Handle input changes
function handleInputChange(e) {
  const { id, value, type, checked } = e.target;
  if (state.formData.hasOwnProperty(id)) {
    state.formData[id] = type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value;

    // Auto-update payment preview when monthly_commitment changes
    if (id === 'monthly_commitment') {
      updatePaymentPreview(parseFloat(value) || 0);
    }
  }
}

// Update payment preview in real-time
function updatePaymentPreview(amount) {
  const monthElements = document.querySelectorAll('[data-month-preview]');
  monthElements.forEach(el => {
    el.textContent = `₱${amount.toLocaleString()}`;
  });

  const totalElement = document.getElementById('total-semester-payment');
  if (totalElement) {
    totalElement.textContent = `₱${(amount * 6).toLocaleString()}`;
  }
}

// Handle file uploads
function handleFiles(files) {
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      showToast(`${file.name} is too large (max 10MB)`, 'error');
      continue;
    }
    state.documents.push(file);
  }
  render();
}

// Email availability check
async function checkEmailAvailability(email) {
  if (!validateEmail(email)) {
    return { available: false, message: 'Invalid email format' };
  }

  try {
    // Check via API endpoint
    const response = await fetch(`/api/v1/admissions/check-email/?email=${encodeURIComponent(email)}`);
    const data = await response.json();

    return {
      available: data.available,
      message: data.available ? 'Email is available' : 'This email is already registered'
    };
  } catch (error) {
    console.error('Email check error:', error);
    return { available: true, message: '' }; // Fail open - let backend validate
  }
}

// Automatic email availability check on blur
window.checkEmailAvailabilityAuto = async function() {
  const email = state.formData.email;
  const statusEl = document.getElementById('email-status');

  if (!email) {
    statusEl.className = 'text-sm mt-1';
    statusEl.textContent = '';
    return;
  }

  // Validate email format first
  if (!validateEmail(email)) {
    statusEl.className = 'text-sm mt-1 text-red-600';
    statusEl.textContent = '✗ Invalid email format';
    return;
  }

  statusEl.className = 'text-sm mt-1 text-gray-500';
  statusEl.textContent = 'Checking availability...';

  const result = await checkEmailAvailability(email);

  if (result.available) {
    statusEl.className = 'text-sm mt-1 text-green-600';
    statusEl.textContent = '✓ Email is available';
  } else {
    statusEl.className = 'text-sm mt-1 text-red-600';
    statusEl.textContent = '✗ ' + result.message;
  }
};

// Remove file
window.removeFile = function (index) {
  state.documents.splice(index, 1);
  render();
};

// Navigation functions
window.nextStep = function () {
  if (validateCurrentStep()) {
    state.currentStep++;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

window.prevStep = function () {
  state.currentStep--;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Validate current step
function validateCurrentStep() {
  switch (state.currentStep) {
    case 1:
      if (!validateRequired(state.formData.first_name)) {
        showToast('First name is required', 'error');
        return false;
      }
      if (!validateRequired(state.formData.last_name)) {
        showToast('Last name is required', 'error');
        return false;
      }
      if (!validateEmail(state.formData.email)) {
        showToast('Please enter a valid email address', 'error');
        return false;
      }
      if (!validateRequired(state.formData.birthdate)) {
        showToast('Birthdate is required', 'error');
        return false;
      }
      if (!validatePhone(state.formData.contact_number)) {
        showToast('Please enter a valid contact number', 'error');
        return false;
      }
      if (!validateRequired(state.formData.address)) {
        showToast('Address is required', 'error');
        return false;
      }
      return true;

    case 2:
      if (!state.formData.program_id) {
        showToast('Please select a program', 'error');
        return false;
      }
      return true;

    case 3:
      // Documents are optional for now
      return true;

    case 4:
      if (!state.formData.monthly_commitment || state.formData.monthly_commitment <= 0) {
        showToast('Please enter a valid monthly commitment amount', 'error');
        return false;
      }
      if (state.formData.is_transferee) {
        if (!validateRequired(state.formData.previous_school)) {
          showToast('Previous school is required for transferees', 'error');
          return false;
        }
      }
      return true;

    default:
      return true;
  }
}

// Submit enrollment
window.submitEnrollment = async function () {
  const agreeTerms = document.getElementById('agree-terms');
  if (!agreeTerms?.checked) {
    showToast('Please agree to the terms and conditions', 'error');
    return;
  }

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Submitting...
  `;

  try {
    const response = await fetch('/api/v1/admissions/enroll/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.formData)
    });

    if (response.ok) {
      const data = await response.json();
      showToast('Enrollment submitted successfully!', 'success');


      // Redirect to success page with credentials from server
      setTimeout(() => {
        const creds = data.credentials || {};
        const params = new URLSearchParams({
          student_number: creds.student_number || data.data?.student?.student_number || '2025-00001',
          login_email: creds.login_email || state.formData.email,  // Personal email for login
          school_email: creds.school_email || '',
          password: creds.password || creds.student_number || '2025-00001',
          first_name: state.formData.first_name,
          last_name: state.formData.last_name,
          status: 'PENDING'
        });
        window.location.href = `/enrollment-success.html?${params.toString()}`;
      }, 1500);
    } else {
      const error = await response.json();
      console.error('Enrollment error:', error);
      // Extract specific error messages
      let errorMessage = 'Enrollment failed. Please try again.';
      if (error.errors) {
        const errorMessages = Object.entries(error.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        errorMessage = errorMessages || errorMessage;
      } else if (error.detail) {
        errorMessage = error.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      showToast(errorMessage, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Submit Enrollment
      `;
    }
  } catch (error) {
    showToast('Network error. Please check your connection.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
      </svg>
      Submit Enrollment
    `;
  }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', init);

// Initialize immediately if DOM is already ready
if (document.readyState !== 'loading') {
  init();
}
