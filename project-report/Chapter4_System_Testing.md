# Chapter 4: System Testing

## 4.1 Test Cases

### 4.1.1 Functional Test Cases

| Test Case ID | Description | Expected Result |
| :--- | :--- | :--- |
| TC-001 | Verify that a user can successfully create a new account. | A new user account is created, and the user is redirected to the login page. |
| TC-002 | Verify that a registered user can log in. | The user is successfully logged in and redirected to the home page. |
| TC-003 | Verify that the product catalog is displayed on the home page. | A grid of product cards is visible. |
| TC-004 | Verify that clicking a product card opens a 3D preview. | An interactive 3D model of the product is displayed. |
| TC-005 | Verify that the AR try-on feature can be initiated. | The browser prompts for camera access. |
| TC-006 | Verify that the 3D model is correctly overlaid in the AR view. | The 3D model of the product appears on the user's hand/foot. |

### 4.1.2 Non-functional Test Cases

| Test Case ID | Description | Expected Result |
| :--- | :--- | :--- |
| TC-NFR-001 | Test the responsiveness of the UI on different screen sizes. | The layout adjusts correctly on mobile, tablet, and desktop screens. |
| TC-NFR-002 | Measure the performance of the AR try-on feature. | The frame rate should be stable, and the model should track smoothly. |
| TC-NFR-003 | Test the application on different web browsers. | The application should function correctly on Chrome, Firefox, and Safari. |

## 4.2 Unit / Integration / Acceptance Testing

### 4.2.1 Unit Testing

Unit testing for this project would focus on individual React components. For example, a unit test for the `ModelPreview` component would verify that it correctly loads and displays a 3D model given a specific product ID. Due to the nature of the project as a rapid prototype, extensive unit tests were not implemented.

### 4.2.2 Integration Testing

Integration testing was performed manually to ensure that the different parts of the application work together as expected. This included:

*   Testing the flow from the product catalog to the 3D preview and then to the AR try-on.
*   Verifying that the state changes in the UI (e.g., user login) are correctly reflected across the application.

### 4.2.3 Acceptance Testing

User acceptance testing was conducted by the project developer, who acted as the end-user to validate the functionality against the requirements. The focus was on the core user stories:

*   As a user, I want to browse products and view them in 3D.
*   As a user, I want to try on a product using AR to see how it looks on me.

<figure>
  <svg viewBox="0 0 920 600" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Testing pyramid segmented in a single triangle">
    <defs>
      <style>
        .title{font: 700 20px 'Franklin Gothic Book', Arial, sans-serif; fill:#000000}
        .text{font: 700 16px 'Franklin Gothic Book', Arial, sans-serif; fill:#000000}
        .pct{font: 700 14px 'Franklin Gothic Book', Arial, sans-serif; fill:#000000}
        .cap{font: 400 14px 'Franklin Gothic Book', Arial, sans-serif; fill:#000000}
        .legend{font: 600 14px 'Franklin Gothic Book', Arial, sans-serif; fill:#000000}
        .stroke{stroke-width:2}
      </style>
      <linearGradient id="triGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f59e0b" />
        <stop offset="50%" stop-color="#3b82f6" />
        <stop offset="100%" stop-color="#22c55e" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.25" />
      </filter>
      <clipPath id="triClip">
        <polygon points="460,90 740,500 180,500" />
      </clipPath>
    </defs>

    <text class="title" x="20" y="36">Testing Pyramid</text>

    <rect x="720" y="10" width="190" height="60" rx="10" ry="10" fill="#ffffff" stroke="#7c3aed" stroke-width="2" />
    <circle cx="735" cy="32" r="6" fill="#f59e0b" />
    <text class="legend" x="750" y="36">E2E / Acceptance</text>
    <circle cx="835" cy="32" r="6" fill="#3b82f6" />
    <text class="legend" x="850" y="36">Integration</text>
    <circle cx="735" cy="58" r="6" fill="#22c55e" />
    <text class="legend" x="750" y="62">Unit</text>

    <polygon points="460,90 740,500 180,500" fill="url(#triGrad)" stroke="#0a0a0a" class="stroke" filter="url(#shadow)" />
    <g clip-path="url(#triClip)">
      <rect x="180" y="240" width="560" height="40" fill="rgba(255,255,255,0.35)" />
      <rect x="180" y="360" width="560" height="60" fill="rgba(255,255,255,0.35)" />
    </g>
    <text class="text" x="410" y="200">E2E / Acceptance</text>
    <text class="pct" x="430" y="180">~15%</text>
    <text class="text" x="430" y="300">Integration</text>
    <text class="pct" x="450" y="280">~35%</text>
    <text class="text" x="450" y="410">Unit</text>
    <text class="pct" x="470" y="390">~50%</text>

    <text class="cap" x="40" y="520">Unit tests: fast, isolate components and utilities.</text>
    <text class="cap" x="40" y="544">Integration tests: verify coordination and flows.</text>
    <text class="cap" x="40" y="568">E2E / Acceptance: full user journeys on target browsers/devices.</text>
  </svg>
  <figcaption><em>Figure 4.1: Testing Pyramid for Chrono Stride AR</em></figcaption>
</figure>