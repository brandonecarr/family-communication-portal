"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  FolderOpen,
  GripVertical,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "../../../supabase/client";

interface SupplyCategory {
  id: string;
  agency_id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

interface SupplyCatalogItem {
  id: string;
  agency_id: string;
  category_id: string;
  name: string;
  description: string | null;
  unit: string;
  sizes: string[] | null;
  requires_size: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  track_inventory: boolean;
  quantity_on_hand: number;
  low_stock_threshold: number;
  size_quantities: Record<string, number> | null;
}

interface SupplyCatalogManagementProps {
  agencyId: string;
}

export function SupplyCatalogManagement({ agencyId }: SupplyCatalogManagementProps) {
  const [categories, setCategories] = useState<SupplyCategory[]>([]);
  const [items, setItems] = useState<SupplyCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<SupplyCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", description: "" });
  const [savingCategory, setSavingCategory] = useState(false);
  
  // Item dialog state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplyCatalogItem | null>(null);
  const [itemForm, setItemForm] = useState({ 
    name: "", 
    description: "", 
    unit: "each", 
    category_id: "",
    requires_size: false,
    sizes: "", // Comma-separated string for input
    track_inventory: false,
    quantity_on_hand: 0,
    low_stock_threshold: 5,
    size_quantities: {} as Record<string, number>,
  });
  const [savingItem, setSavingItem] = useState(false);
  
  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "item"; id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Add stock dialog state
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [addStockItem, setAddStockItem] = useState<SupplyCatalogItem | null>(null);
  const [addStockQuantity, setAddStockQuantity] = useState(0);
  const [addStockSize, setAddStockSize] = useState<string>("");
  const [addingStock, setAddingStock] = useState(false);
  
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [agencyId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, itemsRes] = await Promise.all([
        supabase
          .from("supply_categories")
          .select("*")
          .eq("agency_id", agencyId)
          .order("display_order", { ascending: true }),
        supabase
          .from("supply_catalog_items")
          .select("*")
          .eq("agency_id", agencyId)
          .order("display_order", { ascending: true }),
      ]);

      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (itemsRes.data) setItems(itemsRes.data);
      
      // Expand all categories by default
      if (categoriesRes.data) {
        setExpandedCategories(new Set(categoriesRes.data.map(c => c.id)));
      }
    } catch (error) {
      console.error("Error fetching supply catalog:", error);
      toast({
        title: "Error",
        description: "Failed to load supply catalog",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Category handlers
  const openCategoryDialog = (category?: SupplyCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, description: category.description || "" });
    } else {
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "" });
    }
    setCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    setSavingCategory(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("supply_categories")
          .update({
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim() || null,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast({ title: "Success", description: "Category updated successfully" });
      } else {
        const maxOrder = Math.max(0, ...categories.map(c => c.display_order));
        const { error } = await supabase
          .from("supply_categories")
          .insert({
            agency_id: agencyId,
            name: categoryForm.name.trim(),
            description: categoryForm.description.trim() || null,
            display_order: maxOrder + 1,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Category created successfully" });
      }

      setCategoryDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save category",
        variant: "destructive",
      });
    } finally {
      setSavingCategory(false);
    }
  };

  const toggleCategoryActive = async (category: SupplyCategory) => {
    try {
      const { error } = await supabase
        .from("supply_categories")
        .update({ is_active: !category.is_active })
        .eq("id", category.id);

      if (error) throw error;
      
      setCategories(prev => 
        prev.map(c => c.id === category.id ? { ...c, is_active: !c.is_active } : c)
      );
      
      toast({
        title: "Success",
        description: `Category ${!category.is_active ? "activated" : "deactivated"}`,
      });
    } catch (error) {
      console.error("Error toggling category:", error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  // Item handlers
  const openItemDialog = (categoryId?: string, item?: SupplyCatalogItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        description: item.description || "",
        unit: item.unit,
        category_id: item.category_id,
        requires_size: item.requires_size || false,
        sizes: item.sizes?.join(", ") || "",
        track_inventory: item.track_inventory || false,
        quantity_on_hand: item.quantity_on_hand || 0,
        low_stock_threshold: item.low_stock_threshold || 5,
        size_quantities: item.size_quantities || {},
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: "",
        description: "",
        unit: "each",
        category_id: categoryId || (categories[0]?.id || ""),
        requires_size: false,
        sizes: "",
        track_inventory: false,
        quantity_on_hand: 0,
        low_stock_threshold: 5,
        size_quantities: {},
      });
    }
    setItemDialogOpen(true);
  };

  const saveItem = async () => {
    if (!itemForm.name.trim()) {
      toast({
        title: "Error",
        description: "Item name is required",
        variant: "destructive",
      });
      return;
    }

    if (!itemForm.category_id) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    setSavingItem(true);
    try {
      // Parse sizes from comma-separated string
      const sizesArray = itemForm.requires_size && itemForm.sizes.trim()
        ? itemForm.sizes.split(",").map(s => s.trim()).filter(s => s)
        : null;

      // Build size_quantities object if tracking inventory with sizes
      let sizeQuantities: Record<string, number> | null = null;
      if (itemForm.track_inventory && itemForm.requires_size && sizesArray) {
        sizeQuantities = {};
        sizesArray.forEach(size => {
          sizeQuantities![size] = itemForm.size_quantities[size] || 0;
        });
      }

      if (editingItem) {
        const { error } = await supabase
          .from("supply_catalog_items")
          .update({
            name: itemForm.name.trim(),
            description: itemForm.description.trim() || null,
            unit: itemForm.unit,
            category_id: itemForm.category_id,
            requires_size: itemForm.requires_size,
            sizes: sizesArray,
            track_inventory: itemForm.track_inventory,
            quantity_on_hand: itemForm.track_inventory && !itemForm.requires_size ? itemForm.quantity_on_hand : 0,
            low_stock_threshold: itemForm.low_stock_threshold,
            size_quantities: sizeQuantities,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        toast({ title: "Success", description: "Item updated successfully" });
      } else {
        const categoryItems = items.filter(i => i.category_id === itemForm.category_id);
        const maxOrder = Math.max(0, ...categoryItems.map(i => i.display_order));
        
        const { error } = await supabase
          .from("supply_catalog_items")
          .insert({
            agency_id: agencyId,
            category_id: itemForm.category_id,
            name: itemForm.name.trim(),
            description: itemForm.description.trim() || null,
            unit: itemForm.unit,
            requires_size: itemForm.requires_size,
            sizes: sizesArray,
            display_order: maxOrder + 1,
            track_inventory: itemForm.track_inventory,
            quantity_on_hand: itemForm.track_inventory && !itemForm.requires_size ? itemForm.quantity_on_hand : 0,
            low_stock_threshold: itemForm.low_stock_threshold,
            size_quantities: sizeQuantities,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Item created successfully" });
      }

      setItemDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error saving item:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save item",
        variant: "destructive",
      });
    } finally {
      setSavingItem(false);
    }
  };

  const toggleItemActive = async (item: SupplyCatalogItem) => {
    try {
      const { error } = await supabase
        .from("supply_catalog_items")
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) throw error;
      
      setItems(prev => 
        prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i)
      );
      
      toast({
        title: "Success",
        description: `Item ${!item.is_active ? "activated" : "deactivated"}`,
      });
    } catch (error) {
      console.error("Error toggling item:", error);
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  // Delete handlers
  const confirmDelete = (type: "category" | "item", id: string, name: string) => {
    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const table = deleteTarget.type === "category" ? "supply_categories" : "supply_catalog_items";
      const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${deleteTarget.type === "category" ? "Category" : "Item"} deleted successfully`,
      });

      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const getItemsForCategory = (categoryId: string) => {
    return items.filter(item => item.category_id === categoryId);
  };

  if (loading) {
    return (
      <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-light" style={{ fontFamily: 'Fraunces, serif' }}>
            Supply Catalog
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Manage the categories and items that families can request
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => openCategoryDialog()}
            className="flex items-center gap-2 h-10 px-4 py-2 text-sm font-medium"
          >
            <FolderOpen className="h-4 w-4" />
            Add Category
          </Button>
          <Button
            onClick={() => openItemDialog()}
            disabled={categories.length === 0}
            className="bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white h-10 px-4 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Categories and Items */}
      {categories.length === 0 ? (
        <Card className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Categories Yet</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md">
              Create your first supply category to start building your catalog. Categories help organize supplies for families to request.
            </p>
            <Button
              onClick={() => openCategoryDialog()}
              className="bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryItems = getItemsForCategory(category.id);
            const isExpanded = expandedCategories.has(category.id);

            return (
              <Card key={category.id} className="border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => toggleCategory(category.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-[#7A9B8E]" />
                        <CardTitle className="text-lg">{category.name}</CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {categoryItems.length} {categoryItems.length === 1 ? "item" : "items"}
                        </Badge>
                        {!category.is_active && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => toggleCategoryActive(category)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openCategoryDialog(category)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete("category", category.id, category.name)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {category.description && (
                    <CardDescription className="ml-8">{category.description}</CardDescription>
                  )}
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="pt-2">
                    {categoryItems.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground border border-dashed rounded-lg">
                        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No items in this category</p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => openItemDialog(category.id)}
                          className="text-[#7A9B8E]"
                        >
                          Add first item
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {categoryItems.map((item) => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors ${
                              !item.is_active ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm">{item.name}</p>
                                  {item.requires_size && (
                                    <Badge variant="outline" className="text-xs">
                                      Sizes: {item.sizes?.join(", ") || "Not set"}
                                    </Badge>
                                  )}
                                  {item.track_inventory && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        item.requires_size 
                                          ? Object.values(item.size_quantities || {}).some(q => q <= item.low_stock_threshold)
                                            ? "bg-[#D4876F]/10 text-[#D4876F] border-[#D4876F]/30"
                                            : "bg-[#7A9B8E]/10 text-[#7A9B8E] border-[#7A9B8E]/30"
                                          : item.quantity_on_hand <= item.low_stock_threshold
                                            ? "bg-[#D4876F]/10 text-[#D4876F] border-[#D4876F]/30"
                                            : "bg-[#7A9B8E]/10 text-[#7A9B8E] border-[#7A9B8E]/30"
                                      }`}
                                    >
                                      {item.requires_size 
                                        ? `Stock: ${Object.entries(item.size_quantities || {}).map(([s, q]) => `${s}:${q}`).join(", ") || "0"}`
                                        : `In Stock: ${item.quantity_on_hand}`
                                      }
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Unit: {item.unit}
                                  {item.description && ` • ${item.description}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!item.is_active && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Inactive
                                </Badge>
                              )}
                              <Switch
                                checked={item.is_active}
                                onCheckedChange={() => toggleItemActive(item)}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openItemDialog(undefined, item)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => confirmDelete("item", item.id, item.name)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openItemDialog(category.id)}
                          className="w-full mt-2 text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Item to {category.name}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Update the category details below"
                : "Add a new category to organize your supply items"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Category Name *</Label>
              <Input
                id="category-name"
                value={categoryForm.name}
                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                placeholder="e.g., Personal Care, Medical Supplies"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={categoryForm.description}
                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                placeholder="Optional description for this category"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoryDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveCategory}
              disabled={savingCategory}
              className="bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white"
            >
              {savingCategory && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingCategory ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add Item"}
            </DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Update the item details below"
                : "Add a new supply item that families can request"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="item-category">Category *</Label>
              <Select
                value={itemForm.category_id}
                onValueChange={(value) => setItemForm({ ...itemForm, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name *</Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                placeholder="e.g., Disposable Gloves, Bed Pads"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-unit">Unit</Label>
              <Select
                value={itemForm.unit}
                onValueChange={(value) => setItemForm({ ...itemForm, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="each">Each</SelectItem>
                  <SelectItem value="box">Box</SelectItem>
                  <SelectItem value="pack">Pack</SelectItem>
                  <SelectItem value="roll">Roll</SelectItem>
                  <SelectItem value="bottle">Bottle</SelectItem>
                  <SelectItem value="tube">Tube</SelectItem>
                  <SelectItem value="bag">Bag</SelectItem>
                  <SelectItem value="case">Case</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-description">Description</Label>
              <Textarea
                id="item-description"
                value={itemForm.description}
                onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                placeholder="Optional description or notes about this item"
                rows={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="requires-size"
                checked={itemForm.requires_size}
                onCheckedChange={(checked) => setItemForm({ ...itemForm, requires_size: checked })}
              />
              <Label htmlFor="requires-size" className="cursor-pointer">
                This item requires a size selection
              </Label>
            </div>
            {itemForm.requires_size && (
              <div className="space-y-2">
                <Label htmlFor="item-sizes">Available Sizes</Label>
                <Input
                  id="item-sizes"
                  value={itemForm.sizes}
                  onChange={(e) => setItemForm({ ...itemForm, sizes: e.target.value })}
                  placeholder="e.g., Small, Medium, Large, XL"
                />
                <p className="text-xs text-muted-foreground">
                  Enter sizes separated by commas
                </p>
              </div>
            )}
            
            {/* Inventory Tracking Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  id="track-inventory"
                  checked={itemForm.track_inventory}
                  onCheckedChange={(checked) => setItemForm({ ...itemForm, track_inventory: checked })}
                />
                <Label htmlFor="track-inventory" className="cursor-pointer font-medium">
                  Track inventory for this item
                </Label>
              </div>
              
              {itemForm.track_inventory && (
                <div className="space-y-4 pl-4 border-l-2 border-[#7A9B8E]/30">
                  <div className="space-y-2">
                    <Label htmlFor="low-stock-threshold">Low Stock Alert Threshold</Label>
                    <Input
                      id="low-stock-threshold"
                      type="number"
                      min="0"
                      value={itemForm.low_stock_threshold}
                      onChange={(e) => setItemForm({ ...itemForm, low_stock_threshold: parseInt(e.target.value) || 0 })}
                      className="w-32"
                    />
                    <p className="text-xs text-muted-foreground">
                      Alert when quantity falls below this number
                    </p>
                  </div>
                  
                  {!itemForm.requires_size ? (
                    <div className="space-y-2">
                      <Label htmlFor="quantity-on-hand">Quantity On Hand</Label>
                      <Input
                        id="quantity-on-hand"
                        type="number"
                        min="0"
                        value={itemForm.quantity_on_hand}
                        onChange={(e) => setItemForm({ ...itemForm, quantity_on_hand: parseInt(e.target.value) || 0 })}
                        className="w-32"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Label>Quantity Per Size</Label>
                      {itemForm.sizes.split(",").map(s => s.trim()).filter(s => s).map((size) => (
                        <div key={size} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-24">{size}:</span>
                          <Input
                            type="number"
                            min="0"
                            value={itemForm.size_quantities[size] || 0}
                            onChange={(e) => setItemForm({ 
                              ...itemForm, 
                              size_quantities: { 
                                ...itemForm.size_quantities, 
                                [size]: parseInt(e.target.value) || 0 
                              } 
                            })}
                            className="w-24"
                          />
                        </div>
                      ))}
                      {!itemForm.sizes.trim() && (
                        <p className="text-xs text-muted-foreground italic">
                          Add sizes above to set quantities per size
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveItem}
              disabled={savingItem}
              className="bg-[#7A9B8E] hover:bg-[#6a8b7e] text-white"
            >
              {savingItem && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingItem ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "category" ? "Category" : "Item"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "category" ? (
                <>
                  This will permanently delete the category "{deleteTarget?.name}" and all items within it.
                  This action cannot be undone.
                </>
              ) : (
                <>
                  This will permanently delete "{deleteTarget?.name}" from your supply catalog.
                  This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
