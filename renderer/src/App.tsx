import { useEffect, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  TextField,
  Grid,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  const [apiKeyError, setApiKeyError] = useState("");
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [pendingApiKey, setPendingApiKey] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<{ epubPath?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
    window.guardianApi.onResetSettings(() => {
      setShowResetDialog(true);
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

    setIsGenerating(true);
    try {
      const response = await window.guardianApi.run({
        apiKey,
        sections: selectedSections,
      });
      setResult(response);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSection = (section: string) => {
    setSelectedSections(current => {
      if (current.includes(section)) {
        return current.filter(item => item !== section);
      }
      return [...current, section];
    });
  };

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: { active: any; over: any }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    setSelectedSections(current => {
      const oldIndex = current.indexOf(active.id);
      const newIndex = current.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
  };

  const SortableRow = ({ section }: { section: string }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: section });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div ref={setNodeRef} style={style} className="selected-section-row">
        <span>{section}</span>
        <button
          type="button"
          className="drag-handle"
          aria-label={`Reorder ${section}`}
          {...attributes}
          {...listeners}
        >
          <DragIndicatorIcon fontSize="small" />
        </button>
      </div>
    );
  };

  return (
    <div className="app">
      {!hasFetchedSections && (
        <header>
          <h1>Guardian ePub</h1>
          <p>
            Use Tools → API Key to enter your Guardian API key.
          </p>
        </header>
      )}

      <section className="panel">
        <div className="sections-layout">
          <div className="sections-card">
            <div className="sections-card-header">Sections</div>
            <FormControl
              size="small"
              fullWidth
              disabled={!apiKey || !hasFetchedSections}
            >
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
              <FormHelperText>Select one or more sections.</FormHelperText>
            </FormControl>
          </div>

          <div className="selected-sections">
            <div className="selected-sections-header">Selected order</div>
            {selectedSections.length === 0 ? (
              <div className="selected-sections-empty">
                No sections selected yet.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={selectedSections}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="selected-sections-list">
                    {selectedSections.map(section => (
                      <SortableRow key={section} section={section} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        <div className="actions">
          <button
            type="button"
            onClick={handleRun}
            disabled={!apiKey || selectedSections.length === 0 || isGenerating}
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

      <Dialog
        open={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Reset Settings</DialogTitle>
        <DialogContent>
          This will clear your stored API key and section selections. Continue?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetDialog(false)}>No</Button>
          <Button
            onClick={async () => {
              await window.guardianApi.resetSettings();
              setApiKey("");
              setSections([]);
              setSelectedSections([]);
              setHasFetchedSections(false);
              setApiKeyError("");
              setShowResetDialog(false);
              setLog(current => [...current, "Settings cleared."]);
            }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
