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

![Testing Pyramid](https://i.imgur.com/example.png)  
*Figure 4.1: Testing Pyramid for Chrono Stride AR*