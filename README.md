<!-- # React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project. -->

# Agentic Local Assistant Chatbot

A React application featuring a local tool execution agentic pattern powered by the OpenRouter API. This app lets an LLM call local client-side tools (a Todo list and a Stopwatch) seamlessly based on conversation context.

## Prerequisites & Installation

1. **Clone & Setup Directory**: Initialize your Vite React codebase structure.
2. **Install Dependencies**: Ensure you are running within a standard React framework project layout.
3. **Configure Environment Variables**:
   Create a `.env` file in the root configuration directory of the project:

```env
   VITE_OPENROUTER_API_KEY=your_actual_openrouter_api_key_here
```
