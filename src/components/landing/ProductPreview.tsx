import {
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  Circle,
  FileText,
  LayoutGrid,
  List,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Search,
  Users,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tasks = [
  {
    title: "Collect the big ideas",
    tag: "Discovery",
    color: "peach",
    person: "JL",
    date: "Jun 12",
    progress: 35,
    column: 0,
    comments: 3,
  },
  {
    title: "Map the customer journey",
    tag: "Research",
    color: "lavender",
    person: "AM",
    date: "Jun 14",
    progress: 20,
    column: 0,
    comments: 2,
  },
  {
    title: "Bring the new look to life",
    tag: "Design",
    color: "lavender",
    person: "SK",
    date: "Jun 16",
    progress: 65,
    column: 1,
    comments: 5,
  },
  {
    title: "Build a better first impression",
    tag: "Product",
    color: "blue",
    person: "JL",
    date: "Jun 18",
    progress: 45,
    column: 1,
    comments: 2,
  },
  {
    title: "Make room for a fresh start",
    tag: "Planning",
    color: "mint",
    person: "AM",
    date: "Jun 10",
    progress: 100,
    column: 2,
    comments: 4,
  },
  {
    title: "Get everyone on the same page",
    tag: "Team",
    color: "peach",
    person: "SK",
    date: "Jun 11",
    progress: 100,
    column: 2,
    comments: 1,
  },
];
const columns = ["To do", "In progress", "Done"];

export function PreviewAvatars() {
  return (
    <span
      className="preview-avatars"
      aria-label="Sample teammates: Jamie, Alex, and Sam"
    >
      <span>JL</span>
      <span>AM</span>
      <span>SK</span>
    </span>
  );
}

function PreviewCard({ task }: { task: (typeof tasks)[number] }) {
  return (
    <div className="preview-task">
      <div className={`preview-task-tab ${task.color}`}>{task.tag}</div>
      <div className="preview-task-body">
        <div className="preview-task-heading">
          <h4>{task.title}</h4>
          <MoreHorizontal size={15} aria-hidden="true" />
        </div>
        <div className="preview-task-meta">
          <span className={`preview-person ${task.color}`}>{task.person}</span>
          <span>
            <CalendarDays size={11} />
            {task.date}
          </span>
        </div>
        <div className="preview-progress-label">
          <span>Progress</span>
          <span>{task.progress}%</span>
        </div>
        <div
          className="preview-progress"
          role="img"
          aria-label={`${task.progress}% complete`}
        >
          <span style={{ width: `${task.progress}%` }} />
        </div>
        <div className="preview-task-footer">
          <span>
            <MessageSquare size={12} aria-hidden="true" />
            <span className="sr-only">Comments: </span>
            {task.comments}
            <Paperclip size={12} aria-hidden="true" />
            <span className="sr-only">Attachments: </span>1
          </span>
          {task.progress === 100 ? (
            <span className="preview-done">
              <CheckCheck size={13} />
              All set
            </span>
          ) : (
            <span>On track</span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Isolated sample content; preview controls never call application APIs. */
export function ProductPreview() {
  return (
    <div className="product-preview">
      <div className="preview-window-bar">
        <span className="preview-window-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>One workspace. A clearer picture.</span>
        <span className="preview-live">
          <i />
          Sample workspace
        </span>
      </div>
      <div className="preview-workspace">
        <aside
          className="preview-sidebar"
          aria-label="Sample workspace overview"
        >
          <div className="preview-workspace-name">
            <span className="preview-workspace-icon">S</span>Studio workspace
            <ChevronDown size={13} />
          </div>
          <span className="preview-nav-active">
            <LayoutGrid size={14} />
            My boards
          </span>
          <span>
            <CheckCheck size={14} />
            My tasks
          </span>
          <span>
            <CalendarDays size={14} />
            Calendar
          </span>
          <span>
            <Users size={14} />
            Teammates
          </span>
          <p>YOUR BOARDS</p>
          <span className="preview-board-active">
            <i />A fresh perspective
          </span>
          <span>
            <i className="preview-dot-peach" />
            Everyday ideas
          </span>
          <div className="preview-sidebar-note">
            <span>
              Good things start
              <br />
              with a little clarity.
            </span>
            <span aria-hidden="true">✦</span>
          </div>
          <div className="preview-profile">
            <span className="preview-person lavender">JL</span>
            <span>
              Jamie Lee<small>Personal workspace</small>
            </span>
          </div>
        </aside>
        <div className="preview-main">
          <div className="preview-board-heading">
            <div>
              <span className="preview-breadcrumb">
                My boards <span>/</span> Team projects
              </span>
              <h3>
                <span aria-hidden="true">✳</span>A fresh perspective
              </h3>
              <p>A little planning for our next big thing.</p>
            </div>
            <PreviewAvatars />
          </div>
          <Tabs defaultValue="board" className="preview-tabs">
            <div className="preview-toolbar">
              <TabsList
                aria-label="Sample project views"
                className="preview-view-tabs"
              >
                <TabsTrigger value="board">
                  <LayoutGrid size={13} />
                  Board
                </TabsTrigger>
                <TabsTrigger value="list">
                  <List size={13} />
                  List
                </TabsTrigger>
                <TabsTrigger value="calendar">
                  <CalendarDays size={13} />
                  Calendar
                </TabsTrigger>
              </TabsList>
              <span className="preview-search">
                <Search size={13} />
                Find a task…
              </span>
            </div>
            <TabsContent value="board" className="preview-panel" tabIndex={0}>
              <div className="preview-columns">
                {columns.map((column, index) => (
                  <div className="preview-column" key={column}>
                    <div className="preview-column-heading">
                      <span>
                        <i className={`preview-status status-${index}`} />
                        {column}
                        <small>2</small>
                      </span>
                      <MoreHorizontal size={14} aria-hidden="true" />
                    </div>
                    {tasks
                      .filter((task) => task.column === index)
                      .map((task) => (
                        <PreviewCard task={task} key={task.title} />
                      ))}
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="list" className="preview-panel" tabIndex={0}>
              <div className="preview-list">
                <div className="preview-list-header">
                  <span>Task name</span>
                  <span>Status</span>
                  <span>Due date</span>
                </div>
                {tasks.map((task) => (
                  <div className="preview-list-row" key={task.title}>
                    <span>
                      {task.progress === 100 ? (
                        <Check size={15} />
                      ) : (
                        <Circle size={13} />
                      )}
                      {task.title}
                    </span>
                    <span className={`preview-list-status ${task.color}`}>
                      {columns[task.column]}
                    </span>
                    <span>{task.date}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent
              value="calendar"
              className="preview-panel"
              tabIndex={0}
            >
              <div className="preview-calendar">
                <strong>June · Sample schedule</strong>
                <div className="preview-calendar-grid">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => (
                      <span className="preview-calendar-day" key={day}>
                        {day}
                      </span>
                    ),
                  )}
                  {Array.from({ length: 21 }, (_, i) => (
                    <div className="preview-calendar-cell" key={i}>
                      <span>{i + 1}</span>
                      {tasks
                        .filter(
                          (task) => Number(task.date.split(" ")[1]) === i + 1,
                        )
                        .map((task) => (
                          <span
                            key={task.title}
                            className={`preview-calendar-event ${task.color}`}
                          >
                            {task.title}
                          </span>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="preview-bottom-line">
            <span>
              <FileText size={12} />
              Every idea has a place.
            </span>
            <span>
              <span className="preview-status status-2" />
              All changes in sync
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
