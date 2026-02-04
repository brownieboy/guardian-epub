import { useEffect, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Accordion,
  AccordionDetails,
  AccordionSummary,
  FormControl,
  FormHelperText,
  TextField,
  Grid,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import "./index.css";

type ProgressUpdate = {
  current: number;
  total: number;
  message?: string;
};

export default function App() {
  const [apiKey, setApiKey] = useState("");
  const apiKeyRef = useRef("");
  const [sections, setSections] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [hasFetchedSections, setHasFetchedSections] = useState(false);
  const [sectionsExpanded, setSectionsExpanded] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [pendingApiKey, setPendingApiKey] = useState("");
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<{ epubPath?: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    window.guardianApi.onPhase(setPhase);
    window.guardianApi.onProgress(setProgress);
    window.guardianApi.onLog(message =>
      setLog(current => [...current, message]),
    );
    window.guardianApi.onError(message =>
      setLog(current => [...current, `Error: ${message}`]),
    );
    window.guardianApi.onOpenApiDialog(() => {
      setPendingApiKey(apiKey);
      setShowApiDialog(true);
    });
    window.guardianApi.onRefreshSections(() => {
      const currentKey = apiKeyRef.current;
      if (currentKey) {
        handleFetchSections(currentKey);
      } else {
        setLog(current => [...current, "Enter API key to refresh sections."]);
      }
    });

    window.guardianApi
      .loadSettings()
      .then(settings => {
        if (!isMounted || !settings) {
          return;
        }
        if (settings.apiKey) {
          setApiKey(settings.apiKey);
        }
        if (Array.isArray(settings.lastFetchedSections)) {
          setSections(settings.lastFetchedSections);
        }
        if (Array.isArray(settings.selectedSections)) {
          setSelectedSections(settings.selectedSections);
        }
        if (settings.hasFetchedSections) {
          setHasFetchedSections(true);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    apiKeyRef.current = apiKey;
    if (!apiKey) {
      setHasFetchedSections(false);
      setSections([]);
      setSelectedSections([]);
      setApiKeyError("");
      setSectionsExpanded(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey) {
      return;
    }
    window.guardianApi.saveSettings({
      apiKey,
      selectedSections,
      hasFetchedSections,
      lastFetchedSections: sections,
    });
  }, [apiKey, selectedSections, hasFetchedSections, sections]);

  const validateApiKey = (value: string) => {
    if (!value || value.trim().length < 10) {
      return "API key looks too short. Please check it.";
    }
    return "";
  };

  const handleSaveApiKey = () => {
    const validationError = validateApiKey(pendingApiKey);
    if (validationError) {
      setApiKeyError(validationError);
      return;
    }
    setApiKeyError("");
    const trimmedKey = pendingApiKey.trim();
    setApiKey(trimmedKey);
    setShowApiDialog(false);
    if (trimmedKey) {
      handleFetchSections(trimmedKey);
    }
  };

  const handleFetchSections = async (keyOverride?: string) => {
    const keyToUse = keyOverride ?? apiKey;
    const validationError = validateApiKey(keyToUse);
    if (validationError) {
      setApiKeyError(validationError);
      setLog(current => [...current, validationError]);
      return;
    }

    setApiKeyError("");
    try {
      setLog(current => [...current, "Fetching sections..."]);
      const fetched = await window.guardianApi.fetchSections(keyToUse);
      setSections(fetched);
      setLog(current => [...current, `Fetched ${fetched.length} sections.`]);
      const fetchedOk = fetched.length > 0;
      setHasFetchedSections(fetchedOk);
      if (!hasFetchedSections && fetchedOk) {
        setSectionsExpanded(true);
      }
      setSelectedSections(current =>
        current.filter(section => fetched.includes(section)),
      );
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

  const toggleSection = (section: string) => {
    setSelectedSections(current => {
      if (current.includes(section)) {
        return current.filter(item => item !== section);
      }
      return [...current, section];
    });
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    setSelectedSections(current => {
      const next = [...current];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return current;
      }
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  return (
    <div className="app">
      <header>
        <h1>Guardian ePub</h1>
        {!hasFetchedSections && (
          <p>
            Use Tools → API Key to enter your Guardian API key.
          </p>
        )}
      </header>

      <section className="panel">
        <Accordion
          expanded={sectionsExpanded}
          onChange={(_event, isExpanded) => setSectionsExpanded(isExpanded)}
          disabled={!apiKey || !hasFetchedSections}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            Sections
          </AccordionSummary>
          <AccordionDetails>
            <FormControl size="small" fullWidth>
              <List className="sections-list" dense disablePadding>
                <Grid container spacing={0}>
                  {sections.map(section => {
                    const checked = selectedSections.includes(section);
                    return (
                      <Grid item key={section} xs={12} sm={6} md={4}>
                        <ListItem
                          onClick={() => toggleSection(section)}
                          className="sections-list-item"
                          disableGutters
                        >
                          <Checkbox checked={checked} />
                          <ListItemText primary={section} />
                        </ListItem>
                      </Grid>
                    );
                  })}
                </Grid>
              </List>
              <FormHelperText>
                Select one or more sections.
              </FormHelperText>
            </FormControl>
          </AccordionDetails>
        </Accordion>

        {selectedSections.length > 0 && (
          <div className="selected-sections">
            <div className="selected-sections-header">Selected order</div>
            <div className="selected-sections-list">
              {selectedSections.map((section, index) => (
                <div key={section} className="selected-section-row">
                  <span>{section}</span>
                  <div className="selected-section-actions">
                    <button
                      type="button"
                      onClick={() => moveSection(index, "up")}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, "down")}
                      disabled={index === selectedSections.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="actions">
          <button
            type="button"
            onClick={handleRun}
            disabled={!apiKey || selectedSections.length === 0}
          >
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

      <Dialog
        open={showApiDialog}
        onClose={() => setShowApiDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Set API Key</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="API Key"
            type="text"
            fullWidth
            size="small"
            value={pendingApiKey}
            onChange={event => setPendingApiKey(event.target.value)}
            error={Boolean(apiKeyError)}
            helperText={apiKeyError || " "}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApiDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveApiKey}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
