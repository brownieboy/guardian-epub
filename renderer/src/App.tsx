import { useEffect, useState } from "react";
import {
  Box,
  Chip,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import "./index.css";

type ProgressUpdate = {
  current: number;
  total: number;
  message?: string;
};

export default function App() {
  const [apiKey, setApiKey] = useState("");
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [hasFetchedSections, setHasFetchedSections] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
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

  useEffect(() => {
    if (!apiKey) {
      setHasFetchedSections(false);
      setSections([]);
      setSelectedSections([]);
      setApiKeyError("");
    }
  }, [apiKey]);

  const validateApiKey = (value: string) => {
    if (!value || value.trim().length < 10) {
      return "API key looks too short. Please check it.";
    }
    return "";
  };

  const handleFetchSections = async () => {
    const validationError = validateApiKey(apiKey);
    if (validationError) {
      setApiKeyError(validationError);
      setLog(current => [...current, validationError]);
      return;
    }

    setApiKeyError("");
    try {
      const fetched = await window.guardianApi.fetchSections(apiKey);
      setSections(fetched);
      setLog(current => [...current, `Fetched ${fetched.length} sections.`]);
      setHasFetchedSections(fetched.length > 0);
      setSelectedSections([]);
    } catch (error) {
      const message =
        "Failed to fetch sections. Check your API key and network connection.";
      setApiKeyError(message);
      setLog(current => [...current, message]);
    }
  };

  const handleRun = async () => {
    const validationError = validateApiKey(apiKey);
    if (validationError) {
      setApiKeyError(validationError);
      setLog(current => [...current, validationError]);
      return;
    }

    const response = await window.guardianApi.run({
      apiKey,
      sections: selectedSections,
    });
    setResult(response);
  };

  const handleSectionsChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedSections(typeof value === "string" ? value.split(",") : value);
  };

  return (
    <div className="app">
      <header>
        <h1>Guardian ePub</h1>
        <p>Enter your Guardian API key to get started.</p>
      </header>

      <section className="panel">
        <label>
          API Key
          <TextField
            value={apiKey}
            onChange={event => setApiKey(event.target.value)}
            placeholder="Guardian Open Platform API key"
            error={Boolean(apiKeyError)}
            helperText={apiKeyError || " "}
            size="small"
          />
        </label>

        <FormControl
          disabled={!apiKey || !hasFetchedSections}
          size="small"
          fullWidth
        >
          <InputLabel id="sections-select-label">Sections</InputLabel>
          <Select
            labelId="sections-select-label"
            multiple
            value={selectedSections}
            onChange={handleSectionsChange}
            input={<OutlinedInput label="Sections" />}
            renderValue={selected => (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {selected.map(value => (
                  <Chip key={value} label={value} size="small" />
                ))}
              </Box>
            )}
          >
            {sections.map(section => (
              <MenuItem key={section} value={section}>
                {section}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>
            {hasFetchedSections
              ? "Select one or more sections."
              : "Fetch sections to enable."}
          </FormHelperText>
        </FormControl>

        <div className="actions">
          {!hasFetchedSections && (
            <button
              type="button"
              onClick={handleFetchSections}
              disabled={!apiKey}
            >
              Fetch sections
            </button>
          )}
          <button type="button" onClick={handleRun} disabled={!apiKey || selectedSections.length === 0}>
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
