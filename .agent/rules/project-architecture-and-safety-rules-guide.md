---
trigger: always_on
---

# **Project Architecture & Safety Rules**

Role: Expert SvelteKit v2 Developer (Svelte 5 Runes \+ PocketBase).  
Objective: Implement robust, scalable features while strictly adhering to "Shared State" safety protocols and Server-Side Rendering (SSR) best practices.

## **1\.CRITICAL: The "Shared State" Safety Protocol**

**Context:** To prevent cross-user data leaks, we strictly separate Server-Side and Client-Side PocketBase instances.

### **Rule 1.1: Server-Side Context (SSR)**

* **Scope:** Files ending in .server.ts (e.g., \+page.server.ts, \+layout.server.ts, hooks.server.ts).  
* **CONSTRAINT:** **NEVER** import clientOnlyPb from @src/lib/db/pocketbase.ts.  
* **ACTION:** Always use the isolated instance provided in event.locals.  
  * **Reference:** See implementation in @src/hooks.server.ts.  
  * **Pattern:**  
    export const load \= async ({ locals }) \=\> {  
        // … CORRECT: Uses the request-scoped instance  
        const records \= await locals.pb.collection('posts').getList(1, 10);  
    };

### **Rule 1.2: Client-Side Context (Browser)**

* **Scope:** Files ending in .svelte or .ts (client utilities).  
* **CONSTRAINT:** Use the singleton export clientOnlyPb.  
* **ACTION:** Check for existence before use to prevent SSR errors.  
  * **Reference:** See @src/lib/db/pocketbase.ts.  
  * **Pattern:**  
    import { clientOnlyPb } from '$lib/db/pocketbase';

    function handleClick() {  
        // âœ… CORRECT: Explicitly checks availability  
        if (clientOnlyPb) {  
            clientOnlyPb.collection('logs').create({ ... });  
        }  
    }

## **2\. Modern State Management (Svelte 5\)**

**Context:** We utilize Svelte 5 Runes for all reactivity. Legacy Stores (writable, readable) are forbidden for new logic.

* **Constraint:** When implementing complex Svelte 5 logic, the Agent **MUST** leverage available MCP servers/tools to fetch the latest documentation rather than guessing syntax.


### **Rule 2.1: Global State**

* **Pattern:** Encapsulate global state in svelte/reactivity classes using setContext/getContext.  
* **Reference:** Study @src/lib/auth.svelte.ts as the gold standard.  
* **Constraint:** State files must end in .svelte.ts.

### **Rule 2.2: Component Reactivity**

* **Constraint:** Use $state(), $derived(), and $effect() exclusively.  
* **Anti-Pattern:** Do not use let x; $: y \= x \* 2;. Use let x \= $state(0); let y \= $derived(x \* 2);.

## **3\. Styling & UI Architecture (Tailwind v4)**

**Context:** We use Tailwind CSS v4.

### **Rule 3.1: CSS Imports**

* **Constraint:** Use standard CSS syntax. Do not use @tailwind directives.  
* **Reference:** See @src/app.css for the correct @import "tailwindcss"; syntax.

## **4\. UX/UI Strategy**

### **Rule 4.1: Public Facing Pages (Marketing/Landings)**

* **Goal:** Maximum SEO and Performance (Core Web Vitals).  
* **Location:** src/routes/(public)/.  
* **Tech:** Mandatory SSR (Server-Side Rendering).  
* **Design:** Custom UI built from scratch using Tailwind v4 primitives. Avoid heavy component libraries to maintain brand identity and low bundle size.

### **Rule 4.2: Application Pages/logged in (Dashboard/App)**

* **Goal:** Consistency, Productivity, and Interactivity.  
* **Location:** src/routes/admin/ (Admins) or src/routes/app/ (Users).  
* **Tech:** Hybrid.  
  * **Data:** Load initial data via SSR (\+page.server.ts) to avoid loading spinners.  
  * **Interaction:** Hydrate to client-side interactivity.  
* **Design:** Strict usage of shadcn-svelte components for all standard elements (Tables, Forms, Dialogs).

### **Rule 4.3: Knowledge Retrieval (MCP)**

* **Constraint:** When implementing UI with shadcn-svelte, the Agent **MUST** leverage available MCP servers/tools to fetch the latest documentation rather than guessing syntax.

## **5\. Project Structure Map**

* **@src/hooks.server.ts**: The ONLY place createInstance() is called.  
* **@src/lib/config/site.ts**: Single source of truth for site metadata.  
* **@src/routes/admin/**: Protected routes requiring locals.user.role \=== 'admin'.  
* **@src/routes/app/**: Protected routes requiring authenticated locals.user (any role).

## **6\. Data Fetching Strategy**

* **Load Functions:** Fetch essential data in \+page.server.ts.  
* **Form Actions:** Handle all mutations (POST/PUT/DELETE) via actions in \+page.server.ts.  
* **Reference:** See @src/routes/login/+page.server.ts for a robust Form Action example including error handling.

## **7\. Data Validation & Integrity**

**Context:** All data entering the system via forms or API endpoints acts as a boundary between the "unsafe" world (user input) and the "safe" world (BFF/Database).

### **Rule 7.1: Mandatory Zod Schemas**

* **Constraint:** EVERY form submission or API mutation must be validated against a strict **Zod** schema.  
* **Anti-Pattern:** Never access request.formData() manually without validation.

### **Rule 7.2: Superforms Integration**

* **Tooling:** Use sveltekit-superforms for all form handling.  
* **Flow:**  
  1. Define Schema (Zod).  
  2. superValidate(request, zod(schema)) in the server action.  
  3. Check if (\!form.valid) return fail(...).  
  4. Execute DB Logic.  
  5. Return { form }.