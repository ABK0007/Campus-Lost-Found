function readItems() {
  try {
    const raw = localStorage.getItem("lf_items");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function writeItems(items) {
  localStorage.setItem("lf_items", JSON.stringify(items));
}

function App() {
  const [mode, setMode] = React.useState("explore"); // "post" or "explore"
  const [postType, setPostType] = React.useState("lost"); // lost | found
  const [items, setItems] = React.useState(readItems());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const searchBoxRef = React.useRef(null);

  // form state
  const [form, setForm] = React.useState({
    name: "",
    desc: "",
    date: "",
    location: "",
    contact: "",
    ownershipHint: "", // only for lost
  });
  const [imageFile, setImageFile] = React.useState(null);

  // claim state
  const [claimingItem, setClaimingItem] = React.useState(null);
  const [claimProofFile, setClaimProofFile] = React.useState(null);

  React.useEffect(() => {
    writeItems(items);
  }, [items]);

  function getMatchedItems(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const keywords = normalized.split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      const haystack = [
        item.name,
        item.desc,
        item.location,
        item.type,
        item.contact,
        item.date,
      ]
        .join(" ")
        .toLowerCase();

      return keywords.every((keyword) => haystack.includes(keyword));
    });
  }

  function handleSearch() {
    const normalized = searchQuery.trim();
    if (!normalized) {
      setMessage("Please enter a search keyword.");
      setShowSuggestions(false);
      return;
    }
    setMessage("");
    setMode("explore");
    setShowSuggestions(true);
  }

  const searchResults = React.useMemo(() => getMatchedItems(searchQuery), [items, searchQuery]);

  React.useEffect(() => {
    const normalized = searchQuery.trim();
    if (!normalized) {
      setShowSuggestions(false);
      return;
    }

    setShowSuggestions(true);
    setMode("explore");
  }, [searchQuery, items]);

  React.useEffect(() => {
    function handleOutsideClick(e) {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  async function fileToBase64(file) {
    return new Promise((res) => {
      if (!file) return res(null);
      const reader = new FileReader();
      reader.onload = (e) => res(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  async function handlePost(e) {
    e && e.preventDefault();
    if (!form.name || !form.desc) {
      setMessage("Please enter item name and description.");
      return;
    }

    const imgData = await fileToBase64(imageFile);

    const newItem = {
      id: "it_" + Math.random().toString(36).slice(2, 9),
      type: postType,
      name: form.name.trim(),
      desc: form.desc.trim(),
      date: form.date || new Date().toISOString().slice(0, 10),
      location: form.location || "Unknown",
      contact: form.contact || "No contact provided",
      ownershipHint:
        postType === "lost" ? form.ownershipHint.trim().toLowerCase() : "",
      imageData: imgData,
      claimed: false,
      timestamp: Date.now(),
    };

    setItems([newItem, ...items]);
    setMessage("Item posted. View in Explore.");
    // reset form
    setForm({
      name: "",
      desc: "",
      date: "",
      location: "",
      contact: "",
      ownershipHint: "",
    });
    setImageFile(null);
    setMode("explore");
  }

  function openClaimModal(item) {
    setClaimingItem(item);
    setClaimProofFile(null);
    setMessage("");
  }

  function handleClaimSubmit() {
    if (!claimProofFile) {
      setMessage("Please upload a proof image to submit claim.");
      return;
    }
    // mark claimed (demo behavior)
    const copy = items.map((it) =>
      it.id === claimingItem.id ? { ...it, claimed: true } : it
    );
    setItems(copy);
    setMessage("Claim submitted — contact revealed to the claimer (demo).");
    setClaimingItem(null);
    setClaimProofFile(null);
  }

  // remove item helper (optional)
  function removeItem(id) {
    const filtered = items.filter((i) => i.id !== id);
    setItems(filtered);
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-top">
          <h1 className="heading-title-row">
            <span className="material-symbols-outlined heading-icon" aria-hidden="true">
              pageview
            </span>
            <span className="heading-text">Campus Lost &amp; Found</span>
          </h1>
          <div className="search-controls" ref={searchBoxRef}>
            <input
              className="input header-search"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
            />
            <button className="button search-button" type="button" onClick={handleSearch}>
              Search
            </button>

            {showSuggestions && (
              <div className="search-suggestions">
                {searchResults.length === 0 ? (
                  <div className="suggestion-empty">No matching items</div>
                ) : (
                  searchResults.slice(0, 6).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="suggestion-item"
                      onClick={() => {
                        setSearchQuery(item.name);
                        setShowSuggestions(false);
                      }}
                    >
                      {item.imageData ? (
                        <img
                          className="suggestion-thumb"
                          src={item.imageData}
                          alt={item.name}
                        />
                      ) : (
                        <div className="suggestion-thumb suggestion-thumb-placeholder" aria-hidden="true" />
                      )}
                      <span className="suggestion-content">
                        <span className="suggestion-title">{item.name}</span>
                        <span className="suggestion-meta">
                          {item.type} • {item.location}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div className="hint" style={{ marginTop: 12 }}>
          {message}
        </div>
      )}

      {/* POST SECTION */}
      {mode === "post" && (
        <form className="form" onSubmit={handlePost} style={{ marginTop: 12 }}>
          <div className="row">
            <select
              className="input"
              value={postType}
              onChange={(e) => setPostType(e.target.value)}
              style={{ width: 140 }}
            >
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>

            <input
              className="input col"
              placeholder="Item name (e.g. Black wallet)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <textarea
            rows="3"
            className="input"
            placeholder="Description (include unique details)"
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />

          <div className="row">
            <input
              className="input col"
              placeholder="Location (e.g. Library 2nd floor)"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
            <input
              className="input col"
              placeholder="Contact (email or phone)"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
          </div>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files && e.target.files[0])}
          />

          {/* ownership hint only for LOST */}
          {postType === "lost" && (
            <input
              className="input"
              placeholder="Ownership hint (optional: unique mark or serial)"
              value={form.ownershipHint}
              onChange={(e) =>
                setForm({ ...form, ownershipHint: e.target.value })
              }
            />
          )}

          {/* WARNING: ONLY for FOUND posts (fixed per your request) */}
          {postType === "found" && (
            <div className="hint">
              Reminder: Always ask the claimant for valid proof of ownership
              before handing over the item.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button className="button" type="submit">
              Post Item
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setMode("explore");
                setMessage("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* EXPLORE SECTION */}
      {mode === "explore" && (
        <>
          <div className="post-item-cta-wrap">
            <button className="button" onClick={() => setMode("post")}>
              Post Item
            </button>
          </div>

          <h2 className="section-title" style={{ marginTop: 20 }}>
            Explore Items
          </h2>

          {items.length === 0 && (
            <div className="muted" style={{ marginTop: 12 }}>
              No items posted yet.
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            {items.map((item) => (
              <div
                key={item.id}
                className={`item ${item.claimed ? "claimed" : ""}`}
              >
                {item.imageData ? (
                  <img className="thumb" src={item.imageData} alt="" />
                ) : (
                  <div
                    style={{
                      width: 96,
                      height: 96,
                      background: "#f2f2f2",
                      borderRadius: 6,
                    }}
                  />
                )}

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <strong>{item.name}</strong>{" "}
                      <span className="meta">({item.type})</span>
                    </div>

                    <div>
                      {!item.claimed ? (
                        <button
                          className="button"
                          onClick={() => openClaimModal(item)}
                        >
                          Claim
                        </button>
                      ) : (
                        <span className="badge">Claimed</span>
                      )}
                    </div>
                  </div>

                  <div className="meta">{item.desc}</div>
                  <div className="meta">
                    {item.location} — {item.date}
                  </div>
                  <div className="meta">
                    Posted: {new Date(item.timestamp).toLocaleString()}
                  </div>

                  {item.claimed ? (
                    <div className="contact">
                      <div>
                        <strong>Contact:</strong> {item.contact}
                      </div>
                      <div className="muted small">
                        This item was marked claimed.
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* CLAIM MODAL: proof-image-only */}
      {claimingItem && (
        <div className="modal">
          <div className="card">
            <h3>Claim Item</h3>
            <div className="small muted">
              Upload a photo that proves ownership for:{" "}
              <strong>{claimingItem.name}</strong>
            </div>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setClaimProofFile(e.target.files && e.target.files[0])
              }
              style={{ marginTop: 10 }}
            />

            {/* preview (if file selected) */}
            {claimProofFile && (
              <img
                src={URL.createObjectURL(claimProofFile)}
                alt="proof preview"
                className="claim-preview"
              />
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                className="button"
                onClick={
                  handleClaimSubmit ? handleClaimSubmit : handleClaimSubmit
                }
              >
                Submit Verification
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setClaimingItem(null);
                  setClaimProofFile(null);
                }}
              >
                {/* cancel */}Cancel
              </button>
            </div>

            {claimingItem.claimed && (
              <div className="contact" style={{ marginTop: 8 }}>
                <strong>Contact:</strong> {claimingItem.contact}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

