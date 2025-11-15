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

<figure>
  <svg viewBox="0 0 900 560" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chrono Stride AR software architecture diagram">
    <defs>
      <style>
        .box{fill:#121212;stroke:#7c3aed;stroke-width:2.5;rx:12;ry:12}
        .title{font: 700 18px 'Franklin Gothic Book', Arial, sans-serif; fill:#ffffff}
        .text{font: 400 15px 'Franklin Gothic Book', Arial, sans-serif; fill:rgba(255,255,255,0.85)}
        .layer{font: 700 20px 'Franklin Gothic Book', Arial, sans-serif; fill:#a78bfa}
        .arrow{stroke:#3b82f6;stroke-width:2.5;fill:none;marker-end:url(#arrowHead)}
      </style>
      <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
      </marker>
    </defs>

    <!-- Layer labels -->
    <text x="30" y="40" class="layer">Presentation & Application Layer</text>
    <text x="30" y="210" class="layer">3D / AR Layer</text>
    <text x="30" y="380" class="layer">Infrastructure & Assets</text>

    <!-- UI box -->
    <rect class="box" x="30" y="60" width="390" height="110" />
    <text class="title" x="45" y="90">UI (React, Ant Design)</text>
    <text class="text" x="45" y="116">Pages: Home, Product, Cart, Login, Signup</text>
    <text class="text" x="45" y="140">Components: Navbar, Footer, ModelPreview, Cards</text>

    <!-- Routing/State box -->
    <rect class="box" x="440" y="60" width="430" height="110" />
    <text class="title" x="455" y="90">Routing & State</text>
    <text class="text" x="455" y="116">React Router (routes in App.jsx)</text>
    <text class="text" x="455" y="140">Cart Context / Store (add to cart, totals)</text>

    <!-- 3D/AR box -->
    <rect class="box" x="30" y="230" width="840" height="120" />
    <text class="title" x="45" y="260">3D / AR Rendering</text>
    <text class="text" x="45" y="286">React Three Fiber, Three.js</text>
    <text class="text" x="300" y="286">WebARRocksHand (tracking, stabilizers, pose filters)</text>
    <text class="text" x="45" y="312">Key components: TryOn.jsx, ModelPreview.jsx</text>

    <!-- Assets box -->
    <rect class="box" x="30" y="400" width="270" height="120" />
    <text class="title" x="45" y="430">3D Assets</text>
    <text class="text" x="45" y="456">GLB models: VTO, bareFootVTO</text>
    <text class="text" x="45" y="480">Occluders, environment maps (HDR)</text>

    <!-- Config box -->
    <rect class="box" x="320" y="400" width="270" height="120" />
    <text class="title" x="335" y="430">Configuration</text>
    <text class="text" x="335" y="456">models/config.js (catalog, pose, occluders)</text>
    <text class="text" x="335" y="480">vite.config.js (assetsInclude, allowedHosts)</text>

    <!-- Dev server box -->
    <rect class="box" x="610" y="400" width="260" height="120" />
    <text class="title" x="625" y="430">Dev & Build</text>
    <text class="text" x="625" y="456">Vite dev server, build, preview</text>
    <text class="text" x="625" y="480">HTTPS tunnel, camera permissions</text>

    <!-- Arrows -->
    <path class="arrow" d="M225 170 L 225 230" />
    <path class="arrow" d="M655 170 L 655 230" />
    <path class="arrow" d="M450 350 L 165 400" />
    <path class="arrow" d="M450 350 L 455 400" />
    <path class="arrow" d="M450 350 L 740 400" />
  </svg>
  <figcaption><em>Figure 3.1: Software Architecture Diagram for Chrono Stride AR</em></figcaption>
</figure>

## 3.5 Class Diagram

<figure>
  <svg viewBox="0 0 980 640" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chrono Stride AR class diagram">
    <defs>
      <style>
        .box{fill:#121212;stroke:#7c3aed;stroke-width:2.5;rx:10;ry:10}
        .title{font: 700 16px 'Franklin Gothic Book', Arial, sans-serif; fill:#ffffff}
        .text{font: 400 14px 'Franklin Gothic Book', Arial, sans-serif; fill:rgba(255,255,255,0.85)}
        .arrow{stroke:#3b82f6;stroke-width:2.5;fill:none;marker-end:url(#arrowHead)}
      </style>
      <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
      </marker>
    </defs>

    <!-- App.jsx -->
    <rect class="box" x="30" y="30" width="280" height="120" />
    <text class="title" x="45" y="58">App (React Router Shell)</text>
    <text class="text" x="45" y="84">Routes: /, /product/:id, /cart, /login, /signup, /try/:modelId</text>
    <text class="text" x="45" y="108">Wraps: Navbar, Footer, Page Routes</text>

    <!-- Navbar/Footer -->
    <rect class="box" x="340" y="30" width="270" height="120" />
    <text class="title" x="355" y="58">Navbar / Footer</text>
    <text class="text" x="355" y="84">Layout and site navigation</text>
    <text class="text" x="355" y="108">Ant Design components</text>

    <!-- Home.jsx -->
    <rect class="box" x="630" y="30" width="320" height="120" />
    <text class="title" x="645" y="58">Home</text>
    <text class="text" x="645" y="84">Discovers GLB assets via import.meta.glob</text>
    <text class="text" x="645" y="108">Renders ModelPreview cards; adds to Cart</text>

    <!-- ModelPreview -->
    <rect class="box" x="630" y="180" width="320" height="120" />
    <text class="title" x="645" y="208">ModelPreview</text>
    <text class="text" x="645" y="234">Props: url, mode ('wrist'|'foot')</text>
    <text class="text" x="645" y="258">Preview render with React Three Fiber</text>

    <!-- TryOn.jsx -->
    <rect class="box" x="30" y="180" width="580" height="160" />
    <text class="title" x="45" y="208">TryOn</text>
    <text class="text" x="45" y="234">Inputs: navigation state { url, mode }, :modelId</text>
    <text class="text" x="45" y="258">Uses: WebARRocksHand (tracking), GLTFLoader, occluders</text>
    <text class="text" x="45" y="282">Reads: findModelById (pose, scale, occluder)</text>

    <!-- Cart Context -->
    <rect class="box" x="30" y="370" width="300" height="140" />
    <text class="title" x="45" y="398">Cart Context</text>
    <text class="text" x="45" y="424">addItem({ id, name, price, mode, url })</text>
    <text class="text" x="45" y="448">State: items[], total</text>

    <!-- Models/config.js -->
    <rect class="box" x="360" y="370" width="270" height="140" />
    <text class="title" x="375" y="398">models/config.js</text>
    <text class="text" x="375" y="424">Catalog: id, type, gltf, occluder, pose</text>
    <text class="text" x="375" y="448">findModelById(id)</text>

    <!-- Vite config -->
    <rect class="box" x="650" y="370" width="300" height="140" />
    <text class="title" x="665" y="398">vite.config.js</text>
    <text class="text" x="665" y="424">assetsInclude: *.glb, *.hdr</text>
    <text class="text" x="665" y="448">allowedHosts, dev server settings</text>

    <!-- Relationships -->
    <path class="arrow" d="M170 150 L 170 180" /> <!-- App -> TryOn -->
    <path class="arrow" d="M780 150 L 780 180" /> <!-- Home -> ModelPreview -->
    <path class="arrow" d="M320 450 L 360 450" /> <!-- Cart -> models/config (indirect via TryOn) -->
    <path class="arrow" d="M610 260 L 650 430" /> <!-- TryOn -> vite.config (assets policy) -->
  </svg>
  <figcaption><em>Figure 3.2: Class diagram of main React components and helpers</em></figcaption>
</figure>

## 3.6 Database Diagram

The following schema supports user accounts, a product catalog, carts, and orders aligned with the app’s flows. Keys and relations are designed for a minimal MVP that can grow to production.

<figure>
  <svg viewBox="0 0 980 600" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chrono Stride AR database schema">
    <defs>
      <style>
        .box{fill:#121212;stroke:#7c3aed;stroke-width:2.5;rx:10;ry:10}
        .title{font: 700 16px 'Franklin Gothic Book', Arial, sans-serif; fill:#ffffff}
        .text{font: 400 14px 'Franklin Gothic Book', Arial, sans-serif; fill:rgba(255,255,255,0.85)}
        .rel{stroke:#3b82f6;stroke-width:2.5;fill:none;marker-end:url(#arrowHead)}
      </style>
      <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
      </marker>
    </defs>

    <!-- User -->
    <rect class="box" x="30" y="30" width="260" height="160" />
    <text class="title" x="45" y="58">User</text>
    <text class="text" x="45" y="84">id (PK)</text>
    <text class="text" x="45" y="106">email (unique)</text>
    <text class="text" x="45" y="128">passwordHash</text>
    <text class="text" x="45" y="150">createdAt</text>

    <!-- Product -->
    <rect class="box" x="360" y="30" width="280" height="180" />
    <text class="title" x="375" y="58">Product</text>
    <text class="text" x="375" y="84">id (PK)</text>
    <text class="text" x="375" y="106">name</text>
    <text class="text" x="375" y="128">price</text>
    <text class="text" x="375" y="150">mode ENUM('foot','wrist')</text>
    <text class="text" x="375" y="172">gltfUrl, occluderUrl (nullable)</text>

    <!-- CartItem -->
    <rect class="box" x="680" y="30" width="270" height="160" />
    <text class="title" x="695" y="58">CartItem</text>
    <text class="text" x="695" y="84">userId (FK → User)</text>
    <text class="text" x="695" y="106">productId (FK → Product)</text>
    <text class="text" x="695" y="128">qty</text>
    <text class="text" x="695" y="150">addedAt</text>

    <!-- Order -->
    <rect class="box" x="140" y="260" width="260" height="160" />
    <text class="title" x="155" y="288">Order</text>
    <text class="text" x="155" y="314">id (PK)</text>
    <text class="text" x="155" y="336">userId (FK → User)</text>
    <text class="text" x="155" y="358">total</text>
    <text class="text" x="155" y="380">createdAt, status</text>

    <!-- OrderItem -->
    <rect class="box" x="440" y="260" width="280" height="180" />
    <text class="title" x="455" y="288">OrderItem</text>
    <text class="text" x="455" y="314">orderId (FK → Order)</text>
    <text class="text" x="455" y="336">productId (FK → Product)</text>
    <text class="text" x="455" y="358">qty</text>
    <text class="text" x="455" y="380">price</text>

    <!-- Relations -->
    <path class="rel" d="M160 190 L 160 260" /> <!-- User -> Order -->
    <path class="rel" d="M300 330 L 440 330" /> <!-- Order -> OrderItem -->
    <path class="rel" d="M500 210 L 500 260" /> <!-- Product -> OrderItem -->
    <path class="rel" d="M860 110 L 860 190 L 160 190" /> <!-- CartItem -> User -->
    <path class="rel" d="M695 190 L 695 210 L 500 210" /> <!-- CartItem -> Product -->
  </svg>
  <figcaption><em>Figure 3.3: Proposed database schema for users, products, carts and orders</em></figcaption>
</figure>

Required data
- User account data: `email`, `passwordHash`, `createdAt` for authentication and profile.
- Product catalog: `name`, `price`, `mode`, `gltfUrl`, `occluderUrl` for rendering and AR.
- Cart items: `userId`, `productId`, `qty` to persist pre‑checkout selections.
- Orders and items: audit and fulfillment records with `status`, `total`, `price` snapshots.

## 3.7 Network Diagram (Gantt Chart)

<figure>
  <svg viewBox="0 0 980 460" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Chrono Stride AR project timeline (6 weeks) with legend and dependencies">
    <defs>
      <style>
        .axis{stroke:#888;stroke-width:1}
        .grid{stroke:rgba(255,255,255,0.15);stroke-width:1}
        .bar{fill:#3b82f6;rx:6;ry:6}
        .bar2{fill:#7c3aed;rx:6;ry:6}
        .bar3{fill:#22c55e;rx:6;ry:6}
        .bar4{fill:#f59e0b;rx:6;ry:6}
        .label{font: 600 14px 'Franklin Gothic Book', Arial, sans-serif; fill:#ffffff}
        .tick{font: 400 12px 'Franklin Gothic Book', Arial, sans-serif; fill:rgba(255,255,255,0.75)}
        .dep{stroke:#a78bfa;stroke-width:2.5;fill:none;marker-end:url(#arrowHead)}
        .legend{font: 600 12px 'Franklin Gothic Book', Arial, sans-serif; fill:#ffffff}
        .inbar{font: 700 12px 'Franklin Gothic Book', Arial, sans-serif; fill:#0a0a0a}
        .milestone{fill:#ef4444}
      </style>
      <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa" />
      </marker>
    </defs>

    <!-- Title -->
    <text class="label" x="20" y="28">Project Timeline (6 Weeks)</text>

    <!-- Legend -->
    <rect x="730" y="10" width="230" height="70" rx="10" ry="10" fill="#121212" stroke="#7c3aed" stroke-width="2" />
    <rect class="bar" x="740" y="22" width="16" height="12" />
    <text class="legend" x="760" y="32">Planning/Testing</text>
    <rect class="bar2" x="740" y="40" width="16" height="12" />
    <text class="legend" x="760" y="50">Frontend UI</text>
    <rect class="bar3" x="870" y="22" width="16" height="12" />
    <text class="legend" x="890" y="32">3D / AR</text>
    <rect class="bar4" x="870" y="40" width="16" height="12" />
    <text class="legend" x="890" y="50">Build / Deploy</text>

    <!-- Axis and grid -->
    <line class="axis" x1="120" y1="100" x2="920" y2="100" />
    <text class="tick" x="140" y="90">W1</text>
    <text class="tick" x="300" y="90">W2</text>
    <text class="tick" x="460" y="90">W3</text>
    <text class="tick" x="620" y="90">W4</text>
    <text class="tick" x="780" y="90">W5</text>
    <text class="tick" x="920" y="90">W6</text>
    <line class="grid" x1="140" y1="100" x2="140" y2="400" />
    <line class="grid" x1="300" y1="100" x2="300" y2="400" />
    <line class="grid" x1="460" y1="100" x2="460" y2="400" />
    <line class="grid" x1="620" y1="100" x2="620" y2="400" />
    <line class="grid" x1="780" y1="100" x2="780" y2="400" />
    <line class="grid" x1="920" y1="100" x2="920" y2="400" />

    <!-- Bars: y rows spaced 60px -->
    <text class="label" x="20" y="150">Planning & Research</text>
    <rect class="bar" x="140" y="130" width="160" height="28" />
    <text class="inbar" x="150" y="148">W1</text>

    <text class="label" x="20" y="210">Frontend UI</text>
    <rect class="bar2" x="300" y="190" width="320" height="28" />
    <text class="inbar" x="310" y="208">W2–W3</text>

    <text class="label" x="20" y="270">3D / AR Integration</text>
    <rect class="bar3" x="460" y="250" width="320" height="28" />
    <text class="inbar" x="470" y="268">W3–W4</text>

    <text class="label" x="20" y="330">Testing</text>
    <rect class="bar" x="620" y="310" width="160" height="28" />
    <text class="inbar" x="630" y="328">W4</text>

    <text class="label" x="20" y="390">Build & Deployment</text>
    <rect class="bar4" x="780" y="370" width="160" height="28" />
    <text class="inbar" x="790" y="388">W5</text>

    <!-- Milestone: feature freeze at end of W4 -->
    <circle class="milestone" cx="780" cy="324" r="6" />
    <text class="tick" x="792" y="328">Feature freeze</text>

    <!-- Dependencies -->
    <path class="dep" d="M 300 144 L 300 190" />   <!-- Planning -> Frontend start -->
    <path class="dep" d="M 460 204 L 460 250" />   <!-- Frontend -> 3D/AR start -->
    <path class="dep" d="M 620 264 L 620 310" />   <!-- 3D/AR -> Testing start -->
    <path class="dep" d="M 780 324 L 780 370" />   <!-- Testing milestone -> Build start -->
  </svg>
  <figcaption><em>Figure 3.4: Clear Gantt timeline with legend, grid and dependencies</em></figcaption>
</figure>

## 3.8 Collaboration Diagram

*(Image Placeholder: A collaboration diagram, similar to a sequence diagram, showing the interactions between objects in the system. It would focus on the collaboration between the UI components and the AR services to render the try-on experience.)*