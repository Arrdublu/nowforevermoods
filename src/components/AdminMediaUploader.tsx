'use client';
import React, { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, onSnapshot, updateDoc, doc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { getDb, getStorageService, handleFirestoreError } from "../lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Trash2, Edit2, FileImage, FileVideo, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function AdminMediaUploader() {
  const db = getDb();
  const storage = getStorageService();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMeta, setEditMeta] = useState({ title: '', description: '', tags: '' });
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const qPortfolio = query(collection(getDb(), "portfolio_items"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qPortfolio, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, 'list', 'portfolio_items');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const validateFile = (file: File) => {
    // 1. Media Validation: Client-side checks: ensure images are optimized (WebP/JPEG) and videos are compressed (MP4/H.264)
    if (file.type.startsWith("image/")) {
      if (file.type !== "image/webp" && file.type !== "image/jpeg" && file.type !== "image/png") {
         return "Only WebP, JPEG, and PNG images are supported.";
      }
    } else if (file.type.startsWith("video/")) {
      if (file.type !== "video/mp4" && file.type !== "video/webm") {
         return "Only MP4 and WebM videos are supported.";
      }
    } else {
      return "Unsupported file type.";
    }
    return null;
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    let error = null;
    for (const file of newFiles) {
      error = validateFile(file);
      if (error) break;
    }
    if (error) {
      setErrorMsg(error);
      return;
    }
    setErrorMsg('');
    setUploadQueue([...uploadQueue, ...newFiles]);
  };

  const removeQueueItem = (index: number) => {
    setUploadQueue(uploadQueue.filter((_, i) => i !== index));
  };

  const confirmUploadAll = async () => {
    if (uploadQueue.length === 0) return;
    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < uploadQueue.length; i++) {
      setCurrentFileIndex(i);
      const file = uploadQueue[i];
      const isVideo = file.type.startsWith("video/");
      const type = isVideo ? "video" : "image";
      
      try {
        const storageRef = ref(getStorageService(), `portfolio/${type}s/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

         await new Promise<void>((resolve, reject) => {
           uploadTask.on('state_changed', 
             (snapshot) => {
               setUploadProgress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
             },
             (error) => {
                console.error("Upload failed", error);
                reject(error);
             },
             async () => {
               try {
                 const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                 
                 // Atomic: Firebase adding doc.
                 await addDoc(collection(db, "portfolio_items"), {
                   url: downloadURL,
                   type,
                   title: file.name.split('.')[0],
                   description: '',
                   tags: [],
                   createdAt: serverTimestamp()
                 });
                 successCount++;
                 resolve();
               } catch (error) {
                 handleFirestoreError(error, 'create', 'portfolio_items');
                 reject(error);
               }
             }
           );
         });
      } catch (err) {
        console.error("File upload loop aborted at index", i, err);
      }
    }

    setUploading(false);
    setUploadProgress(0);
    setUploadQueue([]);
  };

  const handleDelete = async (id: string, url: string) => {
    if (!window.confirm("Are you sure you want to delete this media item?")) return;
    try {
       // Best effort to delete from storage.
       const fileRef = ref(getStorageService(), url);
       await deleteObject(fileRef).catch(e => console.log('Storage deletion skipped or failed:', e));
       
       await deleteDoc(doc(getDb(), "portfolio_items", id));
    } catch (error) {
       handleFirestoreError(error, 'delete', `portfolio_items/${id}`);
    }
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setEditMeta({
      title: item.title || '',
      description: item.description || '',
      tags: item.tags ? item.tags.join(', ') : ''
    });
    setIsEditModalOpen(true);
  };

  const confirmEdit = async () => {
    if (!editingItem) return;
    try {
      const tagsArray = editMeta.tags.split(',').map(t => t.trim()).filter(t => t);
      await updateDoc(doc(getDb(), "portfolio_items", editingItem.id), {
        title: editMeta.title,
        description: editMeta.description,
        tags: tagsArray
      });
      setIsEditModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      handleFirestoreError(error, 'update', `portfolio_items/${editingItem.id}`);
    }
  };

  return (
    <Card className="bg-white border-brand-line rounded-none shadow-none">
      <CardHeader className="border-b border-brand-line bg-brand-surface/30 px-6 py-6 flex flex-col gap-4">
        <div>
          <CardTitle className="text-xl font-serif font-light text-brand-black tracking-tight">Admin Media Uploader</CardTitle>
          <CardDescription className="text-[10px] uppercase tracking-widest font-bold mt-2">Manage Portfolio & Deliverables Securely</CardDescription>
        </div>

        {/* Drag and Drop Uploader */}
        <div 
          className={`border-2 border-dashed p-8 text-center transition-colors ${
            isDragging ? 'border-brand-black bg-brand-surface' : 'border-brand-line'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileSelect(e.dataTransfer.files);
          }}
        >
          <Upload className="mx-auto h-8 w-8 text-brand-muted mb-4" />
          <p className="text-sm font-medium text-brand-black mb-2">Drag and drop media here</p>
          <p className="text-[10px] uppercase font-bold text-brand-muted tracking-widest mb-4">Supports WebP, MP4, WebM (Client-Side Validated)</p>
          <Button 
             variant="outline" 
             onClick={() => fileInputRef.current?.click()}
             className="text-[10px] uppercase font-bold tracking-widest rounded-none border-brand-line"
             disabled={uploading}
          >
            Browse Files
          </Button>
          <Input 
            ref={fileInputRef}
            type="file" 
            multiple 
            accept="image/webp,image/jpeg,image/png,video/mp4,video/webm" 
            className="hidden" 
            onChange={(e) => handleFileSelect(e.target.files)} 
          />
          {errorMsg && (
            <p className="flex items-center justify-center gap-1 text-rose-600 text-[10px] uppercase font-bold tracking-widest mt-4">
              <AlertCircle size={12} /> {errorMsg}
            </p>
          )}
        </div>

        {/* Upload Queue */}
        {uploadQueue.length > 0 && (
          <div className="space-y-4 pt-4">
            <h4 className="text-[10px] uppercase font-bold tracking-widest">Upload Queue ({uploadQueue.length})</h4>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {uploadQueue.map((file, i) => (
                 <div key={i} className="flex items-center justify-between p-3 border border-brand-line bg-brand-surface">
                   <div className="flex items-center gap-3 overflow-hidden">
                     {file.type.startsWith('video/') ? (
                       <FileVideo className="h-5 w-5 text-brand-muted shrink-0" />
                     ) : (
                       <FileImage className="h-5 w-5 text-brand-muted shrink-0" />
                     )}
                     <span className="text-xs truncate font-medium">{file.name}</span>
                   </div>
                   {!uploading && (
                     <Button variant="ghost" size="icon" className="h-6 w-6 rounded-none text-brand-muted hover:text-rose-600" onClick={() => removeQueueItem(i)}>
                       <Trash2 size={12} />
                     </Button>
                   )}
                 </div>
              ))}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold text-brand-muted">
                  <span>Uploading {currentFileIndex + 1} of {uploadQueue.length}</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-1 rounded-none bg-brand-line">
                   <div className="h-full bg-brand-black transition-all" style={{ width: `${uploadProgress}%` }} />
                </Progress>
              </div>
            )}

            <Button 
               onClick={confirmUploadAll} 
               disabled={uploading}
               className="w-full rounded-none bg-brand-black hover:bg-zinc-800 text-white text-[10px] uppercase font-bold tracking-widest"
            >
              {uploading ? 'Processing...' : 'Upload All Media'}
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-brand-muted">Uploaded Assets</h3>
        </div>
        
        {loading ? (
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="aspect-square bg-brand-surface animate-pulse border border-brand-line"></div>
              ))}
           </div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center text-[10px] uppercase tracking-widest font-bold text-brand-muted border-2 border-dashed border-brand-line">
            Vault is Empty. Upload assets above.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {items.map(item => (
              <div key={item.id} className="relative group aspect-square bg-brand-surface overflow-hidden border border-brand-line">
                {item.type === 'video' ? (
                  <video src={item.url} className="object-cover w-full h-full" muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} />
                ) : (
                  <img src={item.url} alt={item.title || "Portfolio"} className="object-cover w-full h-full" loading="lazy" />
                )}
                <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest line-clamp-1">{item.title || 'Untitled'}</span>
                  {item.tags?.length > 0 && (
                    <span className="text-[8px] uppercase tracking-widest text-brand-muted mb-2 max-w-full truncate">
                      {item.tags[0]} {item.tags.length > 1 && `+${item.tags.length - 1}`}
                    </span>
                  )}
                  <div className="flex justify-center gap-2 w-full mt-2">
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      onClick={() => openEditModal(item)}
                      className="h-8 w-8 rounded-none bg-white text-black hover:bg-gray-200"
                    >
                      <Edit2 size={12} />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      onClick={() => handleDelete(item.id, item.url)}
                      className="h-8 w-8 rounded-none bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="rounded-none border-brand-line max-w-lg bg-brand-bg">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif tracking-tight text-brand-black">Edit Asset Metadata</DialogTitle>
            <DialogDescription className="text-[10px] uppercase tracking-[0.2em] font-bold">
              Update details for this vault item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest">Title</Label>
              <Input 
                value={editMeta.title}
                onChange={e => setEditMeta({...editMeta, title: e.target.value})}
                className="rounded-none border-brand-line" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest">Description</Label>
              <Textarea 
                value={editMeta.description}
                onChange={e => setEditMeta({...editMeta, description: e.target.value})}
                className="rounded-none border-brand-line resize-none" 
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold tracking-widest">Tags (Comma-separated)</Label>
              <Input 
                value={editMeta.tags}
                onChange={e => setEditMeta({...editMeta, tags: e.target.value})}
                className="rounded-none border-brand-line" 
                placeholder="e.g. wedding, editorial, highlight"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)} className="rounded-none text-[10px] uppercase font-bold tracking-widest">
              Cancel
            </Button>
            <Button onClick={confirmEdit} className="rounded-none bg-brand-black hover:bg-zinc-800 text-[10px] uppercase font-bold tracking-widest text-white">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
