import { Task } from "@/types/task";
import { FileText, Download, Clock, HardDrive, Filter, Plus } from "lucide-react";
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
      name: attachment,
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

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">Project Hub</h2>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">All project assets and documentation</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 group">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input 
              placeholder="Source, name or task..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 border-border/50 bg-background/50 focus:bg-background"
            />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-2 font-bold px-4 hover:bg-primary/5">
             <Plus className="h-3 w-3" /> New Note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredDocs.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-muted/20 border border-dashed border-border/50 rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center mb-4 shadow-sm">
               <FileText className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No documents found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Upload files to individual tasks to see them aggregated here.</p>
          </div>
        ) : (
          filteredDocs.map((doc, idx) => (
            <Card key={`${doc.taskId}-${idx}`} className="group border-border/50 bg-card/60 backdrop-blur-sm hover:shadow-lg transition-all hover:-translate-y-1 hover:border-primary/20 overflow-hidden">
               <CardContent className="p-0">
                  <div className="aspect-video bg-muted/40 relative flex items-center justify-center overflow-hidden">
                     <FileText className="h-12 w-12 text-primary/10 group-hover:scale-110 transition-transform duration-500" />
                     <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                     <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-sm bg-background/90" onClick={() => onTaskClick(tasks.find(t => t.id === doc.taskId)!)}>
                           <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded-sm bg-background/90">
                           <Download className="h-3.5 w-3.5" />
                        </Button>
                     </div>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                     <h4 className="font-bold text-sm text-foreground truncate" title={doc.name}>
                        {doc.name}
                     </h4>
                     <div className="flex flex-col gap-1">
                        <div 
                           onClick={() => onTaskClick(tasks.find(t => t.id === doc.taskId)!)}
                           className="text-[10px] text-primary font-black uppercase tracking-tighter truncate hover:underline cursor-pointer"
                        >
                           {doc.taskTitle}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                           <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(doc.updatedAt).toLocaleDateString()}
                           </div>
                           <span>{doc.size}</span>
                        </div>
                     </div>
                  </div>
               </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
