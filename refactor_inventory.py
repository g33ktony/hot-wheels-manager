"""Script to refactor Inventory.tsx by extracting Add Modal state/handlers."""
import sys

with open('frontend/src/pages/Inventory.tsx', 'r') as f:
    src = f.read()

print(f"Original: {src.count(chr(10))+1} lines, {len(src)} chars")

changes = []

# ── 1. Add import ────────────────────────────────────────────────────────────
OLD1 = "import InventoryEditModal from '@/components/inventory/InventoryEditModal'"
NEW1 = "import InventoryAddModal from '@/components/inventory/InventoryAddModal'\nimport InventoryEditModal from '@/components/inventory/InventoryEditModal'"
assert src.count(OLD1) == 1, f"Step 1: Expected 1 occurrence, got {src.count(OLD1)}"
src = src.replace(OLD1, NEW1, 1)
print("OK 1. Added InventoryAddModal import")

# ── 2. Remove showSuggestions + existingItemToUpdate + customBrandInput etc ──
OLD2 = (
    "    // Search suggestions state\n"
    "    const [showSuggestions, setShowSuggestions] = useState(false)\n"
    "    const [existingItemToUpdate, setExistingItemToUpdate] = useState<any>(null)\n"
    "    const [customBrandInput, setCustomBrandInput] = useState('')\n"
    "    const [showCustomBrandInput, setShowCustomBrandInput] = useState(false)\n"
    "    // Add item modal loading state\n"
    "    const [isAddingItem, setIsAddingItem] = useState(false)\n"
    "    // Photo upload state\n"
    "    const [uploadingPhotos, setUploadingPhotos] = useState(0)\n"
    "    // Hot Wheels catalog search state\n"
    "    const [catalogSearchResults, setCatalogSearchResults] = useState<any[]>([])\n"
    "    const [showCatalogResults, setShowCatalogResults] = useState(false)\n"
    "    const { results: hotWheelsResults, isLoading: isSearchingCatalog, searchByName } = useSearchHotWheels()"
)
assert src.count(OLD2) == 1, f"Step 2: Expected 1 occurrence, got {src.count(OLD2)}"
src = src.replace(OLD2, '', 1)
print("OK 2. Removed Add-modal state variables")

# ── 3. Remove newItem useState ────────────────────────────────────────────────
OLD3_START = "\n    const [newItem, setNewItem] = useState({"
OLD3_END = "        seriesDefaultPrice: 0\n    })\n"
idx_start = src.find(OLD3_START)
assert idx_start != -1, "Step 3: Could not find newItem useState start"
idx_end = src.find(OLD3_END, idx_start)
assert idx_end != -1, "Step 3: Could not find newItem useState end"
idx_end += len(OLD3_END)
removed = src[idx_start:idx_end]
print(f"  Step 3 removing {len(removed)} chars")
src = src[:idx_start] + '\n' + src[idx_end:]
print("OK 3. Removed newItem state")

# ── 4. Remove hotWheelsResults useEffect ─────────────────────────────────────
OLD4 = (
    "\n"
    "    // Monitor Hot Wheels catalog search results\n"
    "    useEffect(() => {\n"
    "        if (hotWheelsResults && hotWheelsResults.length > 0) {\n"
    "            setCatalogSearchResults(hotWheelsResults)\n"
    "        } else {\n"
    "            setCatalogSearchResults([])\n"
    "        }\n"
    "    }, [hotWheelsResults])\n"
    "\n"
)
assert src.count(OLD4) == 1, f"Step 4: Expected 1 occurrence, got {src.count(OLD4)}"
src = src.replace(OLD4, '\n', 1)
print("OK 4. Removed hotWheelsResults useEffect")

# ── 5. Remove handleAddItem ───────────────────────────────────────────────────
OLD5_START = "    const handleAddItem = async () => {"
OLD5_END = "    }\n\n    const resetForm = () => {"
idx_start = src.find(OLD5_START)
assert idx_start != -1, "Step 5a: Could not find handleAddItem start"
# Find end of handleAddItem (just before resetForm)
idx_end = src.find(OLD5_END, idx_start)
assert idx_end != -1, "Step 5a: Could not find handleAddItem end"
idx_end_full = idx_end + len("    }\n\n")
src = src[:idx_start] + src[idx_end_full:]
print("OK 5a. Removed handleAddItem")

# Now remove resetForm
OLD5B_START = "    const resetForm = () => {"
OLD5B_END_MARKER = "        setShowAddModal(false)\n    }\n"
idx_start = src.find(OLD5B_START)
assert idx_start != -1, "Step 5b: Could not find resetForm start"
idx_end = src.find(OLD5B_END_MARKER, idx_start)
assert idx_end != -1, "Step 5b: Could not find resetForm end"
idx_end += len(OLD5B_END_MARKER)
src = src[:idx_start] + src[idx_end:]
print("OK 5b. Removed resetForm")

# ── 6. Remove handleCarIdChange ──────────────────────────────────────────────
OLD6_START = "    // Search and select existing item\n    const handleCarIdChange = (value: string) => {"
OLD6_END_MARKER = "    }, [newItem.carId, inventoryItems])\n"
idx_start = src.find(OLD6_START)
assert idx_start != -1, f"Step 6: Could not find handleCarIdChange, checking: '{src[src.find('handleCarIdChange')-5:src.find('handleCarIdChange')+30]}'" if 'handleCarIdChange' in src else "Step 6: handleCarIdChange not found in src"
idx_end = src.find(OLD6_END_MARKER, idx_start)
assert idx_end != -1, "Step 6: Could not find getMatchingItems end"
idx_end += len(OLD6_END_MARKER)
src = src[:idx_start] + src[idx_end:]
print("OK 6. Removed handleCarIdChange + getMatchingItems")

# ── 7. Remove handleSelectExistingItem ───────────────────────────────────────
OLD7_START = "    const handleSelectExistingItem = (item: any) => {"
OLD7_END_MARKER = "        setShowSuggestions(false)\n    }\n"
idx_start = src.find(OLD7_START)
assert idx_start != -1, "Step 7: Could not find handleSelectExistingItem"
idx_end = src.find(OLD7_END_MARKER, idx_start)
assert idx_end != -1, "Step 7: Could not find handleSelectExistingItem end"
idx_end += len(OLD7_END_MARKER)
src = src[:idx_start] + src[idx_end:]
print("OK 7. Removed handleSelectExistingItem")

# ── 8. Remove handleSelectCatalogItem ────────────────────────────────────────
OLD8_START = "    // Select Hot Wheels catalog item and fill in details\n    const handleSelectCatalogItem = (catalogItem: any) => {"
OLD8_END_MARKER = "        toast.success(`\u2705 ${catalogItem.model} ${typeLabel}${seriesLabel}${photosLabel} agregado`)\n    }\n"
idx_start = src.find(OLD8_START)
assert idx_start != -1, "Step 8: Could not find handleSelectCatalogItem"
idx_end = src.find(OLD8_END_MARKER, idx_start)
assert idx_end != -1, "Step 8: Could not find handleSelectCatalogItem end"
idx_end += len(OLD8_END_MARKER)
src = src[:idx_start] + src[idx_end:]
print("OK 8. Removed handleSelectCatalogItem")

# ── 9. Remove handleCancelUpdate ─────────────────────────────────────────────
OLD9_START = "    const handleCancelUpdate = () => {"
OLD9_END_MARKER = "            location: ''\n        })\n    }\n"
idx_start = src.find(OLD9_START)
assert idx_start != -1, "Step 9: Could not find handleCancelUpdate"
idx_end = src.find(OLD9_END_MARKER, idx_start)
assert idx_end != -1, "Step 9: Could not find handleCancelUpdate end"
idx_end += len(OLD9_END_MARKER)
src = src[:idx_start] + src[idx_end:]
print("OK 9. Removed handleCancelUpdate")

# ── 10. Remove handleBrandChange ─────────────────────────────────────────────
OLD10_START = "    const handleBrandChange = async (value: string) => {"
OLD10_END_MARKER = "        }\n    }\n\n    const handleSaveCustomBrand"
idx_start = src.find(OLD10_START)
assert idx_start != -1, "Step 10: Could not find handleBrandChange"
idx_end = src.find(OLD10_END_MARKER, idx_start)
assert idx_end != -1, "Step 10: Could not find handleBrandChange end"
# Keep the "\n\n    const handleSaveCustomBrand" part - we remove it in step 11
idx_end += len("        }\n    }\n")
src = src[:idx_start] + src[idx_end:]
print("OK 10. Removed handleBrandChange")

# ── 11. Remove handleSaveCustomBrand ─────────────────────────────────────────
OLD11_START = "\n    const handleSaveCustomBrand = async () => {"
OLD11_END_MARKER = "            console.error('Error saving custom brand:', error)\n            }\n        }\n    }\n"
idx_start = src.find(OLD11_START)
assert idx_start != -1, "Step 11: Could not find handleSaveCustomBrand"
idx_end = src.find(OLD11_END_MARKER, idx_start)
assert idx_end != -1, "Step 11: Could not find handleSaveCustomBrand end"
idx_end += len(OLD11_END_MARKER)
src = src[:idx_start] + '\n' + src[idx_end:]
print("OK 11. Removed handleSaveCustomBrand")

# ── 12. Remove calculateSuggestedMargin + handlePurchasePriceChange + handleConditionChange
OLD12_START = "    // Calcular margen de ganancia sugerido basado en condicion"
# Find the end of handleConditionChange
OLD12_END_MARKER = "        }))  \n    }\n\n    // Photo handling"
idx_start = src.find(OLD12_START)
if idx_start == -1:
    # Try without tilde
    OLD12_START = "    // Calcular margen de ganancia"
    idx_start = src.find(OLD12_START)
assert idx_start != -1, "Step 12: Could not find calculateSuggestedMargin start"
idx_end = src.find(OLD12_END_MARKER, idx_start)
if idx_end == -1:
    # Try alternative ending
    OLD12_END_MARKER2 = "    // Photo handling functions with Cloudinary upload"
    idx_end = src.find(OLD12_END_MARKER2, idx_start)
    assert idx_end != -1, "Step 12: Could not find end marker"
    src = src[:idx_start] + '    ' + src[idx_end:]
else:
    idx_end += len(OLD12_END_MARKER)
    src = src[:idx_start] + '\n    // Photo handling' + src[idx_end:]
print("OK 12. Removed calculateSuggestedMargin + handlePurchasePriceChange + handleConditionChange")

# ── 13. Simplify handleFileUpload (remove add branch, keep editing only) ─────
OLD13_START = "    // Photo handling functions with Cloudinary upload\n    const handleFileUpload = async (files: FileList | null, isEditing: boolean = false) => {"
OLD13 = (
    "\n"
    "                    if (isEditing && editingItem) {\n"
    "                            setEditingItem((prev: any) => ({\n"
    "                                ...prev,\n"
    "                                photos: [...(prev.photos || []), result.url]\n"
    "                            }))\n"
    "                        } else {\n"
    "                            setNewItem(prev => ({\n"
    "                                ...prev,\n"
    "                                photos: [...prev.photos, result.url]\n"
    "                            }))\n"
    "                        }"
)
idx_start13 = src.find(OLD13_START)
if idx_start13 != -1:
    # Find the isEditing branch within handleFileUpload
    idx_branch = src.find(OLD13, idx_start13)
    if idx_branch != -1:
        NEW13 = "\n                    setEditingItem((prev: any) => ({\n                        ...prev,\n                        photos: [...(prev.photos || []), result.url]\n                    }))"
        src = src[:idx_branch] + NEW13 + src[idx_branch + len(OLD13):]
        print("OK 13. Simplified handleFileUpload (removed add-mode branch)")
    else:
        print("SKIP 13. handleFileUpload branch not found with exact match, checking...")
        # Show what's around there
        partial = "                    if (isEditing && editingItem)"
        idx = src.find(partial, idx_start13)
        if idx != -1:
            print(f"  Found partial at {idx}: '{src[idx:idx+200]}'")
        else:
            print("  Not found at all")
else:
    print("SKIP 13. handleFileUpload not found")

# ── 14. Simplify removePhoto (remove add branch, keep editing only) ───────────
OLD14 = (
    "    const removePhoto = (index: number, isEditing: boolean = false) => {\n"
    "        if (isEditing && editingItem) {\n"
    "            setEditingItem((prev: any) => ({\n"
    "                ...prev,\n"
    "                photos: prev.photos?.filter((_: any, i: number) => i !== index) || []\n"
    "            }))\n"
    "        } else {\n"
    "            setNewItem(prev => ({\n"
    "                ...prev,\n"
    "                photos: prev.photos.filter((_, i) => i !== index)\n"
    "            }))\n"
    "        }\n"
    "    }\n"
)
NEW14 = (
    "    const removePhoto = (index: number, _isEditing: boolean = false) => {\n"
    "        if (editingItem) {\n"
    "            setEditingItem((prev: any) => ({\n"
    "                ...prev,\n"
    "                photos: prev.photos?.filter((_: any, i: number) => i !== index) || []\n"
    "            }))\n"
    "        }\n"
    "    }\n"
)
if src.count(OLD14) == 1:
    src = src.replace(OLD14, NEW14, 1)
    print("OK 14. Simplified removePhoto")
else:
    print(f"SKIP 14. removePhoto not found exactly (count={src.count(OLD14)})")

# ── 15. Remove useSearchHotWheels import if no longer used ───────────────────
if 'useSearchHotWheels' not in src.replace("import { useSearchHotWheels } from '@/hooks/useSearchHotWheels'", ''):
    src = src.replace("import { useSearchHotWheels } from '@/hooks/useSearchHotWheels'\n", '', 1)
    print("OK 15. Removed useSearchHotWheels import")
else:
    print("SKIP 15. useSearchHotWheels still referenced in file")

# ── 16. Replace Add Modal inline JSX with <InventoryAddModal> ────────────────
MODAL_START = "\n            {/* Add Item Modal */}\n            {showAddModal && ("
MODAL_END = "\n            {/* Edit Item Modal */}"
idx_start = src.find(MODAL_START)
assert idx_start != -1, "Step 16: Could not find Add Modal JSX start"
idx_end = src.find(MODAL_END, idx_start)
assert idx_end != -1, "Step 16: Could not find Add Modal JSX end"

ADD_MODAL_JSX = (
    "\n"
    "            {/* Add Item Modal */}\n"
    "            <InventoryAddModal\n"
    "                isOpen={showAddModal}\n"
    "                isDark={isDark}\n"
    "                allBrands={allBrands}\n"
    "                selectedStore={selectedStore}\n"
    "                inventoryItems={inventoryItems}\n"
    "                onClose={() => setShowAddModal(false)}\n"
    "            />\n"
)
src = src[:idx_start] + ADD_MODAL_JSX + src[idx_end:]
print("OK 16. Replaced Add Modal JSX with <InventoryAddModal>")

# ── 17. Remove createItemMutation if now unused (it's only in handleAddItem) ──
# Keep it since Inventory might use it elsewhere — skip check

# Write result
with open('frontend/src/pages/Inventory.tsx', 'w') as f:
    f.write(src)

print(f"\nDone! New: {src.count(chr(10))+1} lines, {len(src)} chars")
print(f"Reduced by {original_len - len(src)} chars")
