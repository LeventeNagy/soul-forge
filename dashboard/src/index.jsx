(function () {
  "use strict";
  const SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK) return;

  const { React, hooks, components, utils, fetchJSON } = SDK;
  const { useState, useEffect, useCallback, useMemo, useRef } = hooks;
  const { Card, CardHeader, CardTitle, CardContent, Badge, Button, Input, Label, Separator } = components;
  const { cn } = utils;

  const API = "/api/plugins/soul-forge";

  // ─── Template Card ────────────────────────────────────────────────────
  function TemplateCard({ template, selected, onClick }) {
    return React.createElement("div", {
      className: cn("sf-template-card", selected && "sf-template-selected"),
      onClick: onClick,
    },
      React.createElement("div", { className: "sf-template-header" },
        React.createElement("span", { className: "sf-template-name" }, template.name),
        React.createElement(Badge, { variant: "secondary", className: "sf-template-badge" }, template.category),
      ),
      React.createElement("p", { className: "sf-template-desc" }, template.description),
      React.createElement("pre", { className: "sf-template-preview" },
        template.content.substring(0, 150) + "..."
      ),
    );
  }

  // ─── Markdown Preview ─────────────────────────────────────────────────
  function SoulPreview({ content }) {
    if (!content) return React.createElement("div", { className: "sf-empty" }, "Nothing to preview");
    const lines = content.split("\n");
    const elements = [];
    let inList = false;
    let listItems = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(React.createElement("ul", { key: "list-" + elements.length, className: "sf-preview-list" },
          listItems.map((item, i) => React.createElement("li", { key: i }, item))
        ));
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) { flushList(); return; }
      if (trimmed.startsWith("## ")) {
        flushList();
        elements.push(React.createElement("h3", { key: i, className: "sf-preview-h3" }, trimmed.slice(3)));
      } else if (trimmed.startsWith("# ")) {
        flushList();
        elements.push(React.createElement("h2", { key: i, className: "sf-preview-h2" }, trimmed.slice(2)));
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        listItems.push(trimmed.slice(2));
      } else if (/^\d+\.\s/.test(trimmed)) {
        inList = true;
        listItems.push(trimmed.replace(/^\d+\.\s/, ""));
      } else {
        flushList();
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        const children = parts.map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return React.createElement("strong", { key: j }, part.slice(2, -2));
          }
          return part;
        });
        elements.push(React.createElement("p", { key: i, className: "sf-preview-p" }, ...children));
      }
    });
    flushList();
    return React.createElement("div", { className: "sf-preview" }, ...elements);
  }

  // ─── Community Card ───────────────────────────────────────────────────
  function CommunityCard({ item, onUse, onDelete }) {
    return React.createElement(Card, { className: "sf-community-card" },
      React.createElement(CardHeader, null,
        React.createElement("div", { className: "sf-community-header" },
          React.createElement(CardTitle, { className: "sf-community-name" }, item.name),
          React.createElement("div", { className: "sf-community-actions" },
            React.createElement(Button, {
              variant: "ghost", size: "sm",
              onClick: () => onUse(item),
            }, "Use"),
            React.createElement(Button, {
              variant: "ghost", size: "sm",
              className: "sf-delete-btn",
              onClick: () => onDelete(item.id),
            }, "×"),
          ),
        ),
        item.description && React.createElement("p", { className: "sf-community-desc" }, item.description),
      ),
      React.createElement(CardContent, null,
        React.createElement("pre", { className: "sf-community-preview" },
          item.content.substring(0, 200) + (item.content.length > 200 ? "..." : "")
        ),
      ),
    );
  }

  // ─── Main App ─────────────────────────────────────────────────────────
  function SoulForge() {
    const [templates, setTemplates] = useState([]);
    const [profiles, setProfiles] = useState([]);
    const [community, setCommunity] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [description, setDescription] = useState("");
    const [reference, setReference] = useState("");
    const [generated, setGenerated] = useState("");
    const [editing, setEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [selectedProfile, setSelectedProfile] = useState("default");
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [activeTab, setActiveTab] = useState("templates");
    const [showReference, setShowReference] = useState(false);
    // Community form
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const [newContent, setNewContent] = useState("");

    const loadCommunity = useCallback(() => {
      fetchJSON(`${API}/community`).then(setCommunity).catch(() => {});
    }, []);

    useEffect(() => {
      fetchJSON(`${API}/templates`).then(setTemplates).catch(() => {});
      fetchJSON(`${API}/profiles`).then((p) => {
        setProfiles(p);
        if (p.length > 0) setSelectedProfile(p[0].name);
      }).catch(() => {});
      loadCommunity();
    }, [loadCommunity]);

    const showToast = useCallback((msg, type, duration) => {
      setToast({ msg, type });
      setTimeout(() => setToast(null), duration || 3000);
    }, []);

    const handleGenerate = useCallback(async () => {
      if (!description.trim()) return;
      setGenerating(true);
      setGenerated("");
      try {
        const body = {
          description: description.trim(),
          template_id: selectedTemplate || null,
          reference: reference.trim() || null,
        };
        const result = await fetchJSON(`${API}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        setGenerated(result.content);
        setEditContent(result.content);
        setActiveTab("preview");
        showToast("SOUL.MD generated!", "success");
      } catch (err) {
        showToast("Generation failed: " + (err.message || "Unknown error"), "error");
      } finally {
        setGenerating(false);
      }
    }, [description, selectedTemplate, reference, showToast]);

    const handleUseTemplate = useCallback((template) => {
      setSelectedTemplate(template.id);
      setDescription(`Based on "${template.name}": ${template.description}`);
      setGenerated(template.content);
      setEditContent(template.content);
      setActiveTab("preview");
    }, []);

    const handleSave = useCallback(async () => {
      const contentToSave = editing ? editContent : generated;
      if (!contentToSave) return;
      setSaving(true);
      try {
        await fetchJSON(`${API}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: selectedProfile, content: contentToSave }),
        });
        const path = selectedProfile === "default" ? "~/.hermes/SOUL.md" : `~/.hermes/profiles/${selectedProfile}/SOUL.md`;
        showToast(`Saved to ${path} — loads on next session`, "success", 5000);
      } catch (err) {
        showToast("Save failed: " + (err.message || "Unknown error"), "error");
      } finally {
        setSaving(false);
      }
    }, [editing, editContent, generated, selectedProfile, showToast]);

    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(editing ? editContent : generated);
      showToast("Copied to clipboard", "success");
    }, [editing, editContent, generated, showToast]);

    const handleAddCommunity = useCallback(async () => {
      if (!newName.trim() || !newContent.trim()) return;
      try {
        await fetchJSON(`${API}/community`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), content: newContent.trim() }),
        });
        setNewName(""); setNewDesc(""); setNewContent("");
        setShowAddForm(false);
        loadCommunity();
        showToast("Added to community!", "success");
      } catch (err) {
        showToast("Failed to add: " + (err.message || "Unknown error"), "error");
      }
    }, [newName, newDesc, newContent, loadCommunity, showToast]);

    const handleDeleteCommunity = useCallback(async (id) => {
      try {
        await fetchJSON(`${API}/community/${id}`, { method: "DELETE" });
        loadCommunity();
        showToast("Removed", "success");
      } catch (err) {
        showToast("Failed to remove", "error");
      }
    }, [loadCommunity, showToast]);

    const handleUseCommunity = useCallback((item) => {
      setReference(item.content);
      setDescription(`Inspired by "${item.name}": ${item.description || "Custom SOUL.MD from community"}`);
      setActiveTab("generate");
      showToast("Loaded as reference — tweak the description and generate!", "success");
    }, [showToast]);

    // ─── Layout ──────────────────────────────────────────────────────
    return React.createElement("div", { className: "sf-root" },
      toast && React.createElement("div", { className: cn("sf-toast", `sf-toast-${toast.type}`) }, toast.msg),

      React.createElement("div", { className: "sf-header" },
        React.createElement("h1", { className: "sf-title" }, "Soul Forge"),
        React.createElement("p", { className: "sf-subtitle" }, "Generate and customize your agent's personality"),
      ),

      // Tab bar
      React.createElement("div", { className: "sf-tabs" },
        React.createElement("button", { className: cn("sf-tab", activeTab === "templates" && "sf-tab-active"), onClick: () => setActiveTab("templates") }, "Templates"),
        React.createElement("button", { className: cn("sf-tab", activeTab === "generate" && "sf-tab-active"), onClick: () => setActiveTab("generate") }, "Generate"),
        React.createElement("button", { className: cn("sf-tab", activeTab === "preview" && "sf-tab-active"), onClick: () => setActiveTab("preview") }, "Preview"),
        React.createElement("button", { className: cn("sf-tab", activeTab === "community" && "sf-tab-active"), onClick: () => setActiveTab("community") }, "Community"),
      ),

      // ─── Templates Tab ───────────────────────────────────────────
      activeTab === "templates" && React.createElement("div", { className: "sf-content" },
        React.createElement("p", { className: "sf-hint" }, "Click a template to use it as a starting point, or go to Generate to create your own."),
        React.createElement("div", { className: "sf-grid" },
          templates.map((t) =>
            React.createElement(TemplateCard, {
              key: t.id, template: t, selected: selectedTemplate === t.id,
              onClick: () => handleUseTemplate(t),
            })
          ),
        ),
      ),

      // ─── Generate Tab ────────────────────────────────────────────
      activeTab === "generate" && React.createElement("div", { className: "sf-content" },
        React.createElement(Card, null,
          React.createElement(CardHeader, null,
            React.createElement(CardTitle, null, "Describe Your Agent"),
          ),
          React.createElement(CardContent, null,
            React.createElement("p", { className: "sf-hint" },
              "Tell us about the personality you want. Be specific — the more detail, the better the result.",
            ),
            selectedTemplate && React.createElement("div", { className: "sf-selected-template" },
              React.createElement(Badge, { variant: "secondary" }, "Based on: " + templates.find(t => t.id === selectedTemplate)?.name),
              React.createElement("button", { className: "sf-clear-btn", onClick: () => { setSelectedTemplate(null); setDescription(""); } }, "×"),
            ),
            React.createElement("textarea", {
              className: "sf-textarea", rows: 5,
              placeholder: "e.g., I want a witty coding assistant who roasts my bad code but is secretly supportive. Uses British humor. Never lets me ship code without tests.",
              value: description, onChange: (e) => setDescription(e.target.value),
            }),

            // Reference SOUL.MD section
            React.createElement("div", { className: "sf-reference-section" },
              React.createElement("button", {
                className: "sf-reference-toggle",
                onClick: () => setShowReference(!showReference),
              }, showReference ? "× Clear reference" : "+ Add a reference SOUL.MD"),
            ),
            showReference && React.createElement("div", { className: "sf-reference-box" },
              React.createElement("label", { className: "sf-label" }, "Reference SOUL.MD — paste an existing one to match its style:"),
              React.createElement("textarea", {
                className: "sf-textarea sf-reference-textarea", rows: 8,
                placeholder: "Paste an existing SOUL.MD here to use as style reference...",
                value: reference, onChange: (e) => setReference(e.target.value),
              }),
            ),

            React.createElement("div", { className: "sf-actions" },
              React.createElement(Button, {
                onClick: handleGenerate, disabled: generating || !description.trim(),
                className: "sf-generate-btn",
              }, generating ? "Generating..." : "Generate SOUL.MD"),
            ),
          ),
        ),
      ),

      // ─── Preview Tab ─────────────────────────────────────────────
      activeTab === "preview" && React.createElement("div", { className: "sf-content" },
        !generated ? React.createElement("div", { className: "sf-empty-state" },
          React.createElement("p", null, "No SOUL.MD yet. Generate one or pick a template."),
          React.createElement(Button, { onClick: () => setActiveTab("generate") }, "Go to Generator"),
        ) : React.createElement(Card, null,
          React.createElement(CardHeader, null,
            React.createElement("div", { className: "sf-preview-header" },
              React.createElement(CardTitle, null, "Generated SOUL.MD"),
              React.createElement("div", { className: "sf-preview-actions" },
                React.createElement(Button, {
                  variant: "ghost", size: "sm",
                  onClick: () => { setEditing(!editing); if (!editing) setEditContent(generated); },
                }, editing ? "Preview" : "Edit"),
                React.createElement(Button, { variant: "ghost", size: "sm", onClick: handleCopy }, "Copy"),
              ),
            ),
          ),
          React.createElement(CardContent, null,
            editing
              ? React.createElement("textarea", {
                  className: "sf-editor", rows: 20,
                  value: editContent, onChange: (e) => setEditContent(e.target.value),
                })
              : React.createElement(SoulPreview, { content: generated }),
            Separator,
            React.createElement("div", { className: "sf-save-section" },
              React.createElement("div", { className: "sf-save-row" },
                React.createElement("label", { className: "sf-label" }, "Save to profile:"),
                React.createElement("select", {
                  className: "sf-select", value: selectedProfile,
                  onChange: (e) => setSelectedProfile(e.target.value),
                },
                  profiles.map((p) =>
                    React.createElement("option", { key: p.name, value: p.name },
                      p.name + (p.has_soul ? " (has SOUL.MD)" : "")
                    )
                  ),
                ),
                React.createElement(Button, {
                  onClick: handleSave, disabled: saving, className: "sf-save-btn",
                }, saving ? "Saving..." : "Save SOUL.MD"),
              ),
            ),
          ),
        ),
      ),

      // ─── Community Tab ───────────────────────────────────────────
      activeTab === "community" && React.createElement("div", { className: "sf-content" },
        React.createElement("div", { className: "sf-community-top" },
          React.createElement("p", { className: "sf-hint" },
            "Paste SOUL.MD files you found online. Use them as references when generating your own.",
          ),
          React.createElement(Button, {
            onClick: () => setShowAddForm(!showAddForm),
            variant: showAddForm ? "ghost" : "default",
            size: "sm",
          }, showAddForm ? "Cancel" : "+ Add SOUL.MD"),
        ),

        // Add form
        showAddForm && React.createElement(Card, { className: "sf-add-form" },
          React.createElement(CardContent, null,
            React.createElement("input", {
              className: "sf-input", placeholder: "Name (e.g., 'Reddit Coder SOUL')",
              value: newName, onChange: (e) => setNewName(e.target.value),
            }),
            React.createElement("input", {
              className: "sf-input", placeholder: "Description (optional)",
              value: newDesc, onChange: (e) => setNewDesc(e.target.value),
            }),
            React.createElement("textarea", {
              className: "sf-textarea", rows: 10,
              placeholder: "Paste the SOUL.MD content here...",
              value: newContent, onChange: (e) => setNewContent(e.target.value),
            }),
            React.createElement("div", { className: "sf-actions" },
              React.createElement(Button, {
                onClick: handleAddCommunity,
                disabled: !newName.trim() || !newContent.trim(),
              }, "Save to Community"),
            ),
          ),
        ),

        // Community list
        community.length === 0 && !showAddForm
          ? React.createElement("div", { className: "sf-empty-state" },
              React.createElement("p", null, "No community SOUL.MD files yet. Add one from Reddit, GitHub, or anywhere!"),
            )
          : React.createElement("div", { className: "sf-community-grid" },
              community.map((item) =>
                React.createElement(CommunityCard, {
                  key: item.id, item: item,
                  onUse: handleUseCommunity,
                  onDelete: handleDeleteCommunity,
                })
              ),
            ),
      ),
    );
  }

  window.__HERMES_PLUGINS__.register("soul-forge", SoulForge);
})();
