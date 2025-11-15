# Chapter 2: Requirements Analysis

## 2.1 Literature Review / Existing System Study

The development of Chrono Stride AR is informed by a review of existing technologies and platforms in the web-based augmented reality and e-commerce space.

*   **Web-based AR Frameworks:** We evaluated several frameworks for delivering AR experiences in the browser. While platforms like AR.js and A-Frame are popular, we chose **WebAR.rocks** for its specialized and high-performance hand and foot tracking capabilities, which are crucial for our project.
*   **3D Rendering Libraries:** For rendering 3D models in a React environment, **React Three Fiber** was selected. It provides a declarative and component-based approach to building 3D scenes with Three.js, which simplifies development and integrates well with the React ecosystem.
*   **E-commerce Platforms:** We studied existing e-commerce websites that have incorporated AR features. Many of these solutions are native mobile applications, which require users to download and install software. Our project aims to provide a more accessible web-based experience, removing the friction of app installation.

## 2.2 Stakeholders List (Actors)

The primary actors interacting with the Chrono Stride AR system are:

*   **Customer (User):** The end-user who browses the product catalog, views products in 3D, and uses the AR try-on feature.
*   **Administrator:** A user with privileged access to manage the product catalog (e.g., add, update, or remove products). This role is not fully implemented in the current scope but is a key stakeholder for future development.

## 2.3 Requirements Elicitation

The requirements for this project were gathered through an analysis of the problem domain and the desired user experience. The goal was to create a functional proof-of-concept that demonstrates the feasibility and value of web-based AR for e-commerce.

## 2.4 Functional Requirements

*   **FR1: User Registration and Login:** Users shall be able to create an account and log in to the application.
*   **FR2: Product Catalog:** The application shall display a catalog of products (watches and shoes).
*   **FR3: 3D Product Preview:** Users shall be able to view a 3D model of each product.
*   **FR4: AR Try-On:** Users shall be able to virtually try on products using their device's camera.
*   **FR5: Responsive UI:** The application's user interface shall be responsive and adapt to different screen sizes.

## 2.5 Non-functional Requirements

*   **NFR1: Performance:** The AR experience should be smooth and responsive, with minimal lag or jitter.
*   **NFR2: Usability:** The application should be intuitive and easy to use, with clear instructions for the AR feature.
*   **NFR3: Compatibility:** The application should be compatible with modern web browsers on both desktop and mobile devices.
*   **NFR4: Scalability:** The application architecture should be scalable to accommodate a larger product catalog and user base in the future.

## 2.6 Requirements Traceability Matrix

| Requirement ID | Description | Use Case |
| :--- | :--- | :--- |
| FR1 | User Registration and Login | UC-001, UC-002 |
| FR2 | Product Catalog | UC-003 |
| FR3 | 3D Product Preview | UC-004 |
| FR4 | AR Try-On | UC-005 |
| FR5 | Responsive UI | N/A |

## 2.7 Use Case Descriptions

### UC-001: User Registration

*   **Actor:** Customer
*   **Description:** The customer creates a new account by providing a username, email, and password.
*   **Flow:**
    1.  The customer navigates to the Signup page.
    2.  The customer enters their details and submits the form.
    3.  The system validates the input and creates a new user account.

### UC-002: User Login

*   **Actor:** Customer
*   **Description:** The customer logs in to their account.
*   **Flow:**
    1.  The customer navigates to the Login page.
    2.  The customer enters their credentials and submits the form.
    3.  The system authenticates the user and grants access to the application.

### UC-003: Browse Product Catalog

*   **Actor:** Customer
*   **Description:** The customer views the list of available products.
*   **Flow:**
    1.  The customer navigates to the Home page.
    2.  The system displays a grid of product cards.

### UC-004: View 3D Product Preview

*   **Actor:** Customer
*   **Description:** The customer views a 3D model of a selected product.
*   **Flow:**
    1.  The customer clicks on a product card in the catalog.
    2.  The system displays an interactive 3D preview of the product.

### UC-005: AR Try-On

*   **Actor:** Customer
*   **Description:** The customer virtually tries on a product.
*   **Flow:**
    1.  The customer clicks the "Try On" button for a product.
    2.  The system requests camera access.
    3.  Once access is granted, the system displays the camera feed with the 3D model overlaid on the user's hand or foot.

## 2.8 Use Case Diagram

*(Image Placeholder: A Use Case diagram illustrating the interactions between the Customer and the Chrono Stride AR system. The diagram would show the Customer actor connected to the following use cases: Register, Login, Browse Products, View 3D Preview, and AR Try-On.)*

## 2.9 Software Development Life Cycle Model

For the Chrono Stride AR project, an **Agile (Iterative)** development model was adopted. This choice was justified by the following factors:

*   **Flexibility:** The project requirements, particularly those related to the user experience and AR stabilization, were expected to evolve. The iterative nature of Agile allowed for flexibility and adaptation to feedback.
*   **Rapid Prototyping:** The project began as a proof-of-concept. An iterative approach enabled the rapid development of a minimum viable product (MVP) to demonstrate the core functionality.
*   **Incremental Improvement:** Features such as the responsive UI and AR stabilization were improved incrementally over several iterations based on testing and user feedback.