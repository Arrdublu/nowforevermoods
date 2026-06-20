"use client";
import React, { useState, useEffect } from "react";
import { collection, query, onSnapshot, doc, getDocs, addDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { getDb } from "../lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Loader2 } from "lucide-react";

export function AdminBoutiqueEditor() {
    const db = getDb();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [newProduct, setNewProduct] = useState({
        name: "",
        category: "Digital Guides",
        price: 0,
        currency: "USD",
        imageUrl: "",
        inStock: 0,
        isDigital: true,
        isActive: true,
        downloadUrl: ""
    });

    useEffect(() => {
        const q = query(collection(db, "products"));
        const unsub = onSnapshot(q, (snap) => {
            setProducts(snap.docs.map(doc => {
               const data = doc.data();
               return {
                 id: doc.id,
                 name: typeof data.name === 'string' ? data.name : "",
                 category: typeof data.category === 'string' ? data.category : "",
                 price: Number(data.price) || 0,
                 currency: typeof data.currency === 'string' ? data.currency : "USD",
                 imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : "",
                 inStock: Number(data.inStock) || 0,
                 isDigital: Boolean(data.isDigital),
                 isActive: Boolean(data.isActive),
                 downloadUrl: typeof data.downloadUrl === 'string' ? data.downloadUrl : ""
               } as any;
            }));
            setLoading(false);
        }, (error) => {
            import("../lib/firebase").then(({ handleFirestoreError }) => {
                handleFirestoreError(error, "list" as any, "products");
            });
        });
        return () => unsub();
    }, [db]);

    const handleAdd = async () => {
        if (!newProduct.name || !newProduct.price) return alert("Name and price required");
        try {
            await addDoc(collection(db, "products"), {
                ...newProduct,
                price: Number(newProduct.price),
                inStock: Number(newProduct.inStock),
                createdAt: new Date().toISOString()
            });
            setNewProduct({
                name: "", category: "Digital Guides", price: 0, currency: "USD",
                imageUrl: "", inStock: 0, isDigital: true, isActive: true, downloadUrl: ""
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (e) {
            console.error("Failed to add product", e?.message || e);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete product?")) return;
        try {
            await deleteDoc(doc(db, "products", id));
        } catch (e) {
            console.error("Failed to delete product", e?.message || e);
        }
    };

    if (loading) return <div>Loading products...</div>;

    return (
        <Card className="bg-white border-brand-line rounded-none shadow-none">
            <CardHeader>
                <CardTitle className="text-xl font-serif">Boutique Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-brand-surface border border-brand-line">
                    <div>
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Name</Label>
                        <Input value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="rounded-none border-brand-line mt-2" />
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Category</Label>
                        <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value, isDigital: e.target.value !== "Physical Legacy"})} className="w-full h-10 mt-2 border border-brand-line px-3 text-sm bg-white">
                            <option value="Digital Guides">Digital Guides</option>
                            <option value="Presets">Presets</option>
                            <option value="Physical Legacy">Physical Legacy</option>
                        </select>
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Price (USD)</Label>
                        <Input type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="rounded-none border-brand-line mt-2" />
                    </div>
                    <div>
                        <Label className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Image URL</Label>
                        <Input value={newProduct.imageUrl} onChange={e => setNewProduct({...newProduct, imageUrl: e.target.value})} className="rounded-none border-brand-line mt-2" />
                    </div>
                    {newProduct.isDigital ? (
                        <div className="lg:col-span-2">
                            <Label className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Digital File Upload</Label>
                            <div className="flex gap-2 items-center mt-2">
                                <Input 
                                    ref={fileInputRef}
                                    className="rounded-none border-brand-line flex-1 text-[10px] cursor-pointer file:cursor-pointer file:border-0 file:bg-transparent file:text-brand-black file:font-bold file:text-[10px] file:uppercase file:tracking-widest"
                                    type="file" 
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setUploading(true);
                                        try {
                                            const { getStorageService } = await import("../lib/firebase");
                                            const storage = getStorageService();
                                            const { ref, uploadBytesResumable, getDownloadURL } = await import("firebase/storage");
                                            
                                            const fileRef = ref(storage, `products/${Date.now()}_${file.name}`);
                                            const task = uploadBytesResumable(fileRef, file);
                                            
                                            task.on("state_changed", null, (err) => {
                                                console.error("Upload failed", err?.message || err);
                                                setUploading(false);
                                                alert("Upload failed");
                                            }, async () => {
                                                const url = await getDownloadURL(fileRef);
                                                setNewProduct(prev => ({...prev, downloadUrl: url}));
                                                setUploading(false);
                                            });
                                        } catch (error) {
                                            console.error("Storage error:", error?.message || error);
                                            setUploading(false);
                                            alert("Upload initialization failed");
                                        }
                                    }} 
                                />
                                {uploading && <Loader2 className="h-4 w-4 text-brand-muted animate-spin" />}
                                {newProduct.downloadUrl && !uploading && (
                                    <span className="text-[10px] uppercase text-emerald-600 font-bold tracking-widest whitespace-nowrap">File Uploaded</span>
                                )}
                            </div>
                        </div>
                    ) : (
                         <div>
                            <Label className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">In Stock</Label>
                            <Input type="number" value={newProduct.inStock} onChange={e => setNewProduct({...newProduct, inStock: Number(e.target.value)})} className="rounded-none border-brand-line mt-2" />
                        </div>
                    )}
                    <div className="flex items-end lg:col-span-4">
                        <Button onClick={handleAdd} className="rounded-none w-full md:w-auto h-10 bg-brand-black hover:bg-zinc-800 text-white text-[10px] uppercase font-bold tracking-widest px-8">
                            <Plus className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </div>
                </div>

                <div className="space-y-4">
                    {products.map(p => (
                        <div key={p.id} className="flex flex-col md:flex-row items-center justify-between p-4 border border-brand-line gap-4">
                            <div>
                                <h3 className="font-bold text-sm">{p.name} <span className="font-normal text-xs text-brand-muted uppercase tracking-widest ml-2">{p.category}</span></h3>
                                <p className="text-xs text-brand-muted mt-1">${p.price} • {p.isDigital ? 'Digital' : `Stock: ${p.inStock}`}</p>
                            </div>
                            <Button variant="outline" onClick={() => handleDelete(p.id)} className="rounded-none border-red-200 text-red-600 hover:bg-red-50 text-[10px] uppercase font-bold h-8">
                                <Trash2 className="h-3 w-3 mr-2" /> Delete
                            </Button>
                        </div>
                    ))}
                    {products.length === 0 && <p className="text-sm text-brand-muted p-4 italic">No products available.</p>}
                </div>
            </CardContent>
        </Card>
    );
}
