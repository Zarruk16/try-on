# Chapter 3: System Design

## 3.1 Work Breakdown Structure (WBS)

1.  **Project Management**
    1.1. Planning and Scoping
    1.2. Documentation
2.  **Frontend Development**
    2.1. UI/UX Design
    2.2. Component Development (React)
    2.3. Routing (React Router)
3.  **3D and AR Integration**
    3.1. 3D Model Preparation
    3.2. 3D Scene Setup (React Three Fiber)
    3.3. AR Integration (WebAR.rocks)
    3.4. AR Stabilization
4.  **Testing**
    4.1. Component Testing
    4.2. Integration Testing
    4.3. User Acceptance Testing

## 3.2 Activity Diagram

*(Image Placeholder: An activity diagram illustrating the user flow through the application. It would start with the user entering the site, browsing products, selecting a product for a 3D preview, and then proceeding to the AR try-on.)*

## 3.3 Sequence Diagram

*(Image Placeholder: A sequence diagram for the AR try-on feature. It would show the sequence of interactions between the User, the React Frontend, the WebAR.rocks library, and the React Three Fiber scene.)*

## 3.4 Software Architecture

The Chrono Stride AR application follows a **component-based architecture** built on the React library. The architecture can be broken down into the following layers:

*   **Presentation Layer:** This layer is responsible for the user interface. It consists of React components for the navbar, footer, product cards, and pages. The Ant Design library is used for UI components and layout.
*   **Application Layer:** This layer contains the core application logic, including routing (managed by React Router) and state management.
*   **3D/AR Layer:** This is a specialized layer that handles the 3D and AR functionality. It uses React Three Fiber to create and manage the 3D scene and WebAR.rocks for the AR tracking.

![Software Architecture Diagram](https://i.imgur.com/example.png)  
*Figure 3.1: Software Architecture Diagram*

## 3.5 Class Diagram

*(Image Placeholder: A class diagram showing the main React components and their relationships. It would include components like `App`, `Navbar`, `Home`, `ModelPreview`, and `TryOn`, illustrating their props and state.)*

## 3.6 Database Diagram

As the current scope of the project does not include a persistent database for user data or products, a database diagram is not applicable. User authentication is handled on the client-side for this proof-of-concept.

## 3.7 Network Diagram (Gantt Chart)

*(Image Placeholder: A Gantt chart illustrating the project timeline and dependencies. It would show the duration of the main phases of the project, such as planning, development, and testing.)*

## 3.8 Collaboration Diagram

*(Image Placeholder: A collaboration diagram, similar to a sequence diagram, showing the interactions between objects in the system. It would focus on the collaboration between the UI components and the AR services to render the try-on experience.)*