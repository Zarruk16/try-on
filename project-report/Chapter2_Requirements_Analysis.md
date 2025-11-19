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

## 2.10 Use Case Design

This section connects the core use cases to concrete design elements and code in the project, showing how navigation, state, and AR rendering are realized.

### UC-001: User Registration — Design
- Actor: Customer
- Preconditions: User is unauthenticated; Signup route available
- Main flow:
  - User opens Signup and fills name, email, password, confirm password
  - Form validates required fields, email format, and minimum length
  - On submit, system would create account (stubbed in POC)
- Alternate flows:
  - Invalid email or short password → field‑level validation errors shown
  - Existing account → error returned from backend (future work)
- Postconditions: For POC, success feedback is implied; in production, redirect to Login
- UI and validation:
  - Field rules defined in `reactThreeFiberDemos/src/js/pages/Signup.jsx:25–37`
  - Submit/redirect controls in `reactThreeFiberDemos/src/js/pages/Signup.jsx:38–41`

Example
```jsx
// Signup validation rules (excerpt)
<Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
  <Input size="large" placeholder="you@example.com" />
</Form.Item>
<Form.Item name="password" rules={[{ required: true, min: 6 }]}> 
  <Input.Password size="large" placeholder="••••••••" />
</Form.Item>
```

### UC-002: User Login — Design
- Actor: Customer
- Preconditions: Account exists; Login route available
- Main flow:
  - User opens Login and enters email and password
  - Form validates required fields and email format
  - On submit, system would authenticate and set session (stubbed in POC)
- Alternate flows:
  - Invalid credentials → error message (future backend)
  - Third‑party auth via Google button (placeholder)
- Postconditions: Authenticated user is redirected to Home or previous page
- UI and validation:
  - Field rules in `reactThreeFiberDemos/src/js/pages/Login.jsx:25–31`
  - Navigation control to Signup in `reactThreeFiberDemos/src/js/pages/Login.jsx:32–35`

Example
```jsx
// Login form (excerpt)
<Form.Item name="email" rules={[{ required: true, type: 'email' }]}>
  <Input size="large" placeholder="you@example.com" />
</Form.Item>
<Form.Item name="password" rules={[{ required: true }]}> 
  <Input.Password size="large" placeholder="••••••••" />
</Form.Item>
```

### UC-003: Browse Product Catalog — Design
- Actor: Customer
- Preconditions: App shell and routes loaded; assets discoverable
- Main flow:
  - Home discovers available `GLB` assets and prepares display items
  - User sees cards with embedded 3D previews
- Postconditions: User can initiate AR Try‑On or navigate to product details
- Key design hooks:
  - Asset discovery uses `import.meta.glob` to enumerate models in `reactThreeFiberDemos/src/js/components/Home.jsx:11–13`
  - Route definitions are provided by the app shell in `reactThreeFiberDemos/src/App.jsx:25–40`

- Inputs and outputs:
  - Input: local asset files named under `assets/VTO` and `assets/bareFootVTO`
  - Output: card list with `url`, `mode`, `name` used by `ModelPreview` and actions
- UX considerations:
  - Cards are hoverable with preview; calls to action include Try On and Shop
- Performance:
  - Eager import ensures URLs are resolved at build time; `assetsInclude` whitelisting in `reactThreeFiberDemos/vite.config.js:9–14`

Example
```jsx
// Route setup (excerpt)
<Route path="/" element={<Home />} />
<Route path="/product/:id" element={<Product />} />
```

### UC-004: View 3D Product Preview — Design
- Actor: Customer
- Preconditions: Selected product or asset URL available
- Main flow:
  - A `ModelPreview` component renders an interactive preview in the card or product page
- Alternate flow: If preview fails to load, a graceful fallback appears (default framework error boundary)
- Postconditions: Customer can proceed to AR Try‑On or add to cart
- Key design hooks:
  - `Home` renders previews inside cards with `ModelPreview` in `reactThreeFiberDemos/src/js/components/Home.jsx:78–88`
  - `Product` page renders a larger `ModelPreview` and binds actions in `reactThreeFiberDemos/src/js/pages/Product.jsx:16–31`

- Interactions:
  - Orbit/pan via React Three Fiber; preview aids decision before AR
- Data mapping:
  - `url` for GLTF asset; optional `mode` for wrist/foot preview differences

Example
```jsx
// Product page try-on and add-to-cart
const tryOn = (mode) => { navigate('/try/custom', { state: { url, mode } }) }
const addToCart = () => { add({ id, name: id.replace(/\.glb$/i,''), price, qty: 1 }) }
```

### UC-005: AR Try‑On — Design
- Actor: Customer
- Preconditions: Camera permission granted; selected model and pose available
- Main flow:
  - Navigation passes selected asset `url` and `mode` to AR route `/try/:modelId`
  - `TryOn` loads GLTF, applies occluders, and tracks hand/foot with WebAR.rocks
- Alternate flows:
  - Permission denied → the user remains in preview (guided by UI messages)
  - Selfie/environment camera toggling via a control
- Postconditions: AR session renders over the camera feed; user can exit back
- Key design hooks:
  - AR route and component binding in `reactThreeFiberDemos/src/App.jsx:25–40`
  - Custom navigation state handling and model selection in `reactThreeFiberDemos/src/js/demos/TryOn.jsx:101–121`
  - Camera flip and AR helper integration in `reactThreeFiberDemos/src/js/demos/TryOn.jsx:151–176`

- Rendering pipeline:
  - WebAR.rocks trackers feed landmarks → stabilizer → pose → Three.js overlay
- Occlusion:
  - Uses soft cylinder or GLB occluder for realistic depth at `reactThreeFiberDemos/src/js/demos/TryOn.jsx:37–74`
- UX messaging:
  - Inline `Alert` instructs user positioning at `reactThreeFiberDemos/src/js/demos/TryOn.jsx:165–178`

Example
```jsx
// Navigate to AR with selected asset
navigate('/try/custom', { state: { url, mode } })

// In TryOn component (excerpt)
const { modelId } = useParams()
const location = useLocation()
const selectedModel = (modelId === 'custom' && location.state)
  ? { id: 'custom', type: location.state.mode, gltf: location.state.url }
  : findModelById(modelId)
```

### Supporting: Cart State — Design
- Actor: Customer
- Usage: Persist selections and prices
- Key design hooks:
  - Cart store API in `reactThreeFiberDemos/src/js/store/cart.jsx:3–12`
  - `Product` adds an item to cart in `reactThreeFiberDemos/src/js/pages/Product.jsx:21–27`

- Persistence and totals:
  - Items saved in `localStorage` and subtotal computed with `useMemo` in `reactThreeFiberDemos/src/js/store/cart.jsx:3–11`
  - Removal handled by index in `reactThreeFiberDemos/src/js/pages/Cart.jsx:1–23`

Example
```jsx
// Add to cart (excerpt)
const addToCart = () => { add({ id, name, price, qty: 1 }) }
```