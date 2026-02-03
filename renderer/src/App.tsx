import { useEffect, useState } from "react";
import "./index.css";

type ProgressUpdate = {
  current: number;
  total: number;
  message?: string;
};

const defaultSections = "world,uk,us-news";

export default function App() {
  const [apiKey, setApiKey] = useState("");
  const [sectionsInput, setSectionsInput] = useState(defaultSections);
  const [sections, setSections] = useState<string[]>([]);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<{ epubPath?: string } | null>(null);

  useEffect(() => {
    window.guardianApi.onPhase(setPhase);
    window.guardianApi.onProgress(setProgress);
    window.guardianApi.onLog(message =>
      setLog(current => [...current, message]),
    );
    window.guardianApi.onError(message =>
      setLog(current => [...current, `Error: ${message}`]),
    );
  }, []);

  const handleFetchSections = async () => {
    if (!apiKey) {
      setLog(current => [...current, "API key required."]);
      return;
    }
    const fetched = await window.guardianApi.fetchSections(apiKey);
    setSections(fetched);
    setLog(current => [...current, `Fetched ${fetched.length} sections.`]);
  };

  const handleRun = async () => {
    if (!apiKey) {
      setLog(current => [...current, "API key required."]);
      return;
    }
    const sectionList = sectionsInput
      .split(",")
      .map(section => section.trim())
      .filter(Boolean);

    const response = await window.guardianApi.run({
      apiKey,
      sections: sectionList,
    });
    setResult(response);
  };

  return (
    <div className="app">
      <header>
        <h1>Guardian ePub</h1>
        <p>Electron + React + Vite + TypeScript scaffold</p>
      </header>

      <section className="panel">
        <label>
          API Key
          <input
            value={apiKey}
            onChange={event => setApiKey(event.target.value)}
            placeholder="Guardian Open Platform API key"
          />
        </label>

        <label>
          Sections (comma-separated)
          <input
            value={sectionsInput}
            onChange={event => setSectionsInput(event.target.value)}
            placeholder="world,uk,us-news"
          />
        </label>

        <div className="actions">
          <button type="button" onClick={handleFetchSections}>
            Fetch sections
          </button>
          <button type="button" onClick={handleRun}>
            Generate ePub
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>Status</h2>
        <div className="status">
          <div>Phase: {phase || "-"}</div>
          <div>
            Progress: {progress ? `${progress.current}/${progress.total}` : "-"}
          </div>
          <div>Last message: {progress?.message ?? "-"}</div>
        </div>
        {result?.epubPath && (
          <button
            type="button"
            onClick={() => window.guardianApi.openPath(result.epubPath!)}
          >
            Open generated file
          </button>
        )}
      </section>

      <section className="panel">
        <h2>Log</h2>
        <div className="log">
          {log.length === 0 && <div>No messages yet.</div>}
          {log.map((entry, index) => (
            <div key={`${entry}-${index}`}>{entry}</div>
          ))}
        </div>
      </section>

      {sections.length > 0 && (
        <section className="panel">
          <h2>Available sections</h2>
          <div className="section-grid">
            {sections.map(section => (
              <span key={section}>{section}</span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
