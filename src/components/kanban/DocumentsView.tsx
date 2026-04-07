import { Task, Attachment } from "@/types/task";
import { FileText, Download, Clock, HardDrive, Filter, Plus, File, Film, Music, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface DocumentsViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function DocumentsView({ tasks, onTaskClick }: DocumentsViewProps) {
  const [search, setSearch] = useState("");
  
  // Aggregate all attachments from all tasks
  const allDocuments = tasks.flatMap(task => 
    (task.attachments || []).map(attachment => ({
      ...attachment,
      taskId: task.id,
      taskTitle: task.title,
      updatedAt: task.updatedAt,
      size: "2.4 MB" // Mock size
    }))
  );

  const filteredDocs = allDocuments.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.taskTitle.toLowerCase().includes(search.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    if (type.startsWith('video/')) return <Film className="h-10 w-10 text-blue-500/40" />;
    if (type.startsWith('audio/')) return <Music className="h-10 w-10 text-purple-500/40" />;
    if (type.includes('pdf') || type.includes('word') || type.includes('text')) return <FileText className="h-10 w-10 text-orange-500/40" />;
    return <File className="h-10 w-10 text-slate-400/40" />;
  };

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground uppercase italic tracking-tight">Project <span className="text-primary not-italic">Hub</span></h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">All project assets and documentation</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Search assets..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 border-border/50 bg-background/50 focus:bg-background rounded-full"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-2 font-black uppercase text-[10px] px-4 hover:bg-primary/5 rounded-full border-primary/20">
             <Plus className="h-3 w-3" /> New Note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDocs.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-muted/10 border border-dashed border-border/50 rounded-3xl">
            <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-4 shadow-sm">
               <FileText className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No documents found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Upload files to individual tasks to see them aggregated here.</p>
          </div>
        ) : (
          filteredDocs.map((doc, idx) => {
            const isImage = doc.type.startsWith('image/');
            const currentTask = tasks.find(t => t.id === doc.taskId);
            
            return (
              <Card key={`${doc.taskId}-${idx}`} className="group border-border/40 bg-card/40 backdrop-blur-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 hover:-translate-y-1.5 hover:border-primary/30 overflow-hidden rounded-2xl">
                <CardContent className="p-0">
                   <div className="aspect-video bg-muted/30 relative flex items-center justify-center overflow-hidden border-b border-border/10">
                      {isImage ? (
                        <img src={doc.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={doc.name} />
                      ) : (
                        <div className="transition-transform duration-500 group-hover:scale-110">
                          {getFileIcon(doc.type)}
                        </div>
                      )}
                      
                      <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                      
                      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-500">
                         <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 rounded-full bg-background/90 backdrop-blur shadow-lg border-border/10 hover:bg-primary hover:text-primary-foreground transition-colors" 
                            onClick={() => currentTask && onTaskClick(currentTask)}
                            title="View Task"
                         >
                            <Eye className="h-4 w-4" />
                         </Button>
                         <Button 
                            variant="secondary" 
                            size="icon" 
                            className="h-8 w-8 rounded-full bg-background/90 backdrop-blur shadow-lg border-border/10 hover:bg-primary hover:text-primary-foreground transition-colors"
                            title="Download"
                         >
                            <Download className="h-4 w-4" />
                         </Button>
                      </div>
                      
                      {!isImage && (
                        <div className="absolute top-3 left-3">
                           <span className="text-[9px] font-black uppercase tracking-widest bg-background/80 backdrop-blur px-2 py-0.5 rounded-full border border-border/50">
                              {doc.name.split('.').pop()}
                           </span>
                        </div>
                      )}
                   </div>
                   
                   <div className="p-5 flex flex-col gap-3">
                      <div>
                        <h4 className="font-bold text-sm text-foreground truncate leading-tight group-hover:text-primary transition-colors" title={doc.name}>
                           {doc.name}
                        </h4>
                        <div 
                           onClick={() => currentTask && onTaskClick(currentTask)}
                           className="text-[9px] text-muted-foreground font-black uppercase tracking-widest mt-1 hover:text-primary cursor-pointer transition-colors flex items-center gap-1"
                        >
                           <span className="opacity-50">Source:</span> {doc.taskTitle}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 font-bold border-t border-border/5 pt-3">
                         <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 opacity-40" />
                            {new Date(doc.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                         </div>
                         <span className="bg-muted px-1.5 py-0.5 rounded-sm text-[9px]">{doc.size}</span>
                      </div>
                   </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
