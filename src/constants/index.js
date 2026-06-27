export const TOOL_SCHEMAS = [
  {
    type: "function",
    function: {
      name: "add_todo",
      description: "Add a new item to the user's todo list.",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "The task description." },
        },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_todos",
      description: "Retrieve all current items in the todo list.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "complete_todo",
      description: "Mark a specific todo item as completed using its ID.",
      parameters: {
        type: "object",
        properties: {
          id: {
            type: "number",
            description: "The numeric ID of the todo item.",
          },
        },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_stopwatch",
      description: "Start the application stopwatch timer.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "stop_stopwatch",
      description: "Stop/pause the application stopwatch timer.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_stopwatch_time",
      description: "Get the current elapsed time of the stopwatch.",
      parameters: { type: "object", properties: {} },
    },
  },
];
