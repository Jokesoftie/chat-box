import React from "react";

export default function Sidebar({ stopwatchTime, isStopwatchRunning, todos }) {
  return (
    <aside className="sidebar">
      <div className="panel-section">
        <h2>⏱️ Stopwatch</h2>
        <div className="stopwatch-display">{formatTime(stopwatchTime)}</div>
        <div className={`status-badge ${isStopwatchRunning ? "active" : ""}`}>
          {isStopwatchRunning ? "Running" : "Paused | Idle"}
        </div>
        <div className="manual-actions">
          <button
            onClick={() => setIsStopwatchRunning(true)}
            disabled={isStopwatchRunning}
          >
            Start
          </button>
          <button
            onClick={() => setIsStopwatchRunning(false)}
            disabled={!isStopwatchRunning}
          >
            Stop
          </button>
          <button
            onClick={() => {
              setIsStopwatchRunning(false);
              setStopwatchTime(0);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="panel-section">
        <h2>📝 Todo List Panel</h2>
        <ul className="todo-list">
          {todos.length === 0 ? (
            <p className="empty-text">No active items on your schedule.</p>
          ) : (
            todos.map((todo) => (
              <li key={todo.id} className={todo.completed ? "completed" : ""}>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() =>
                    executeLocalTool("complete_todo", { id: todo.id })
                  }
                />
                <span className="todo-text">{todo.text}</span>
                <small className="todo-id">ID: {todo.id}</small>
              </li>
            ))
          )}
        </ul>
      </div>
    </aside>
  );
}
