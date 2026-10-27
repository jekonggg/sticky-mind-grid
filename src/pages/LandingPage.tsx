import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCheck,
  FileText,
  LayoutGrid,
  Menu,
  MessageSquare,
  MousePointer2,
  Paperclip,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingBrand } from "@/components/landing/LandingBrand";
import {
  ProductPreview,
  PreviewAvatars,
} from "@/components/landing/ProductPreview";
import "./landing.css";

const navigation = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#questions", label: "FAQs" },
];
const questions = [
  {
    question: "What is Sticky Mind Grid?",
    answer:
      "Sticky Mind Grid is a collaborative visual workspace for projects and everyday tasks. Organize work on boards, track due dates, share documents, and keep your team’s conversations connected to the work.",
  },
  {
    question: "Can I use it for my own projects?",
    answer:
      "Absolutely. Start with a personal board for your ideas, studies, or next side project. Invite teammates to individual boards whenever you want to collaborate.",
  },
  {
    question: "How does team collaboration work?",
    answer:
      "Invite people to a board by email, assign tasks, and use comments with @mentions to keep the conversation in context. Board changes sync in real time so everyone can follow the latest updates.",
  },
  {
    question: "Can I see my work in different ways?",
    answer:
      "Yes. Switch between a kanban board, task list, calendar, documents, and project overview. Your board and task information stays connected across views.",
  },
  {
    question: "Can I choose who can edit a board?",
    answer:
      "Yes. Boards have owner, admin, editor, commenter, and viewer roles. Give each person the level of access they need, from managing the board to simply following progress.",
  },
];

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
}) {
  return (
    <div className="landing-section-heading">
      <span className="landing-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousTitle = document.title;
    const environmentPrefix = previousTitle.match(/^\[[^\]]+\]\s*/)?.[0] ?? "";
    document.title = `${environmentPrefix}Sticky Mind Grid | Make room for your next big idea`;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 900px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [menuOpen]);

  return (
    <div className="landing-page">
      <a className="landing-skip" href="#main-content">
        Skip to content
      </a>
      <header className="landing-header">
        <div className="landing-header-inner">
          <LandingBrand />
          <nav className="landing-desktop-nav" aria-label="Main navigation">
            {navigation.map((item) => (
              <a key={item.href} href={item.href}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="landing-header-actions">
            <Link to="/login" className="landing-sign-in">
              Sign in
            </Link>
            <Link
              to="/register"
              className="landing-button landing-button-small"
            >
              Get started
              <ArrowRight size={15} />
            </Link>
          </div>
          <button
            ref={menuButton}
            type="button"
            className="landing-menu-button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <nav
          id="landing-mobile-nav"
          className="landing-mobile-nav"
          aria-label="Mobile navigation"
          hidden={!menuOpen}
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
              <ArrowRight size={16} />
            </a>
          ))}
          <Link to="/login">
            Sign in
            <ArrowRight size={16} />
          </Link>
          <Link to="/register" className="landing-button">
            Get started
            <ArrowRight size={16} />
          </Link>
        </nav>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-hero-grid" aria-hidden="true" />
          <div className="landing-hero-content">
            <a href="#product-preview" className="landing-announcement">
              <span>
                <Sparkles size={12} />
                Meet your next workspace
              </span>
              <ArrowRight size={13} />
            </a>
            <h1 id="hero-title">
              Big ideas.
              <br />
              <span>
                Beautifully organized.
                <svg viewBox="0 0 660 16" fill="none" aria-hidden="true">
                  <path d="M3 11C170 1 414 1 657 9M99 15C280 7 462 8 575 13" />
                </svg>
              </span>
            </h1>
            <p>
              Turn a head full of ideas into a plan you can see.
              <br className="landing-desktop-break" /> Bring your tasks,
              teammates, and next big thing together.
            </p>
            <div className="landing-hero-actions">
              <Link to="/register" className="landing-button">
                Find your flow
                <ArrowRight size={17} />
              </Link>
              <a
                href="#product-preview"
                className="landing-button landing-button-outline"
              >
                Take a look inside
                <ArrowDown size={16} />
              </a>
            </div>
            <div className="landing-hero-note">
              <span>
                <Check size={13} />A home for your ideas
              </span>
              <span>
                <Check size={13} />
                Built for working together
              </span>
            </div>
          </div>
          <div id="product-preview" className="landing-preview-wrap">
            <div className="landing-preview-caption">
              <span>
                <i />A little structure. A lot of possibility.
              </span>
              <span>
                Explore the views below
                <ArrowDown size={12} />
              </span>
            </div>
            <ProductPreview />
            <div className="landing-preview-footnote">
              <span className="landing-spark" aria-hidden="true">
                ✳
              </span>
              From “what if” to “we did it.”
            </div>
          </div>
        </section>

        <div
          className="landing-capabilities landing-container"
          aria-label="Workspace capabilities"
        >
          <p>YOUR WORK, CONNECTED</p>
          <div>
            <span>
              <LayoutGrid />
              Visual planning
            </span>
            <span>
              <Users />
              Team collaboration
            </span>
            <span>
              <CheckCheck />
              Clear progress
            </span>
            <span>
              <FileText />
              Shared knowledge
            </span>
          </div>
        </div>

        <section
          id="features"
          className="landing-features landing-section"
          aria-labelledby="features-title"
        >
          <div className="landing-container">
            <SectionHeading
              eyebrow="A clearer way to work"
              title={
                <span id="features-title">
                  Less chasing updates.
                  <br />
                  More moving forward.
                </span>
              }
              description="Give every idea a place, every task a next step, and everyone a shared picture of what’s happening."
            />
            <div className="landing-feature-grid">
              <article className="landing-feature-card landing-feature-board">
                <div className="landing-feature-copy">
                  <span className="landing-feature-icon">
                    <LayoutGrid size={21} />
                  </span>
                  <h3>A board for every big idea.</h3>
                  <p>
                    Make your process visible. Create custom columns, move tasks
                    as work evolves, and find the view that works for you.
                  </p>
                </div>
                <div className="feature-mini-board" aria-hidden="true">
                  {["Ideas", "In motion", "Made it"].map((title, index) => (
                    <div key={title}>
                      <span>
                        <i className={`preview-status status-${index}`} />
                        {title}
                        <small>2</small>
                      </span>
                      <div
                        className={`feature-mini-task ${["peach", "lavender", "mint"][index]}`}
                      >
                        <i />
                        <strong>
                          {
                            [
                              "A spark of inspiration",
                              "Something taking shape",
                              "That done feeling",
                            ][index]
                          }
                        </strong>
                        <span />
                        <span className="feature-mini-task-short" />
                        <b>{["JL", "AM", "SK"][index]}</b>
                      </div>
                      <div className="feature-mini-task-ghost" />
                    </div>
                  ))}
                  <span className="feature-cursor">
                    <MousePointer2 size={21} fill="currentColor" />
                    <b>You</b>
                  </span>
                </div>
              </article>
              <article className="landing-feature-card landing-feature-team">
                <div className="landing-feature-copy">
                  <span className="landing-feature-icon">
                    <Users size={21} />
                  </span>
                  <h3>Same page. Same momentum.</h3>
                  <p>
                    Invite your people, assign the next step, and keep
                    conversations right where the work happens.
                  </p>
                </div>
                <div className="feature-conversation">
                  <div>
                    <span className="preview-person lavender">AM</span>
                    <p>
                      <strong>Alex Morgan</strong>
                      <small>Just now</small>
                      <span>
                        <b>@Jamie</b> The first concepts are ready for a look ✨
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="preview-person peach">JL</span>
                    <p>
                      <strong>Jamie Lee</strong>
                      <small>Just now</small>
                      <span>Love this direction. Let’s bring it to life!</span>
                    </p>
                  </div>
                  <span className="feature-sync">
                    <i />
                    Little updates. Everyone in the loop.
                  </span>
                </div>
              </article>
              <article className="landing-feature-card landing-feature-context">
                <div className="landing-feature-copy">
                  <span className="landing-feature-icon">
                    <Paperclip size={21} />
                  </span>
                  <h3>Keep the whole story together.</h3>
                  <p>
                    The brief, the files, the tiny details. Give your work the
                    context it needs with documents, attachments, and
                    checklists.
                  </p>
                </div>
                <div className="feature-files" aria-hidden="true">
                  <div>
                    <span>
                      <FileText size={21} />
                    </span>
                    <p>
                      <strong>The big picture</strong>
                      <small>Project notes · Everything starts here</small>
                    </p>
                    <Check size={16} />
                  </div>
                  <div>
                    <span className="feature-file-peach">
                      <Paperclip size={21} />
                    </span>
                    <p>
                      <strong>A little inspiration</strong>
                      <small>Task attachments · Keep it connected</small>
                    </p>
                    <Check size={16} />
                  </div>
                  <div className="feature-checklist">
                    <CheckCheck size={16} />
                    <span>Small steps. Real progress.</span>
                    <strong>3 / 3</strong>
                  </div>
                </div>
              </article>
              <article className="landing-feature-card landing-feature-control">
                <div>
                  <ShieldCheck size={24} />
                  <h3>
                    Your space.
                    <br />
                    The right people.
                  </h3>
                  <p>
                    From owners to viewers, choose who can do what with five
                    board roles.
                  </p>
                  <a href="#questions">
                    A little more peace of mind
                    <ArrowRight size={15} />
                  </a>
                </div>
                <div
                  className="feature-role-list"
                  aria-label="Example board roles"
                >
                  {[
                    ["JL", "Jamie", "Owner"],
                    ["AM", "Alex", "Editor"],
                    ["SK", "Sam", "Viewer"],
                  ].map(([initials, name, role]) => (
                    <div key={role}>
                      <span className="preview-person">{initials}</span>
                      <strong>{name}</strong>
                      <span>
                        {role}
                        <ChevronIcon />
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="landing-how landing-section"
          aria-labelledby="how-title"
        >
          <div className="landing-container">
            <SectionHeading
              eyebrow="From scattered to started"
              title={
                <span id="how-title">
                  Good work starts with a little clarity.
                </span>
              }
              description="No complicated setup. Just a space to make things happen."
            />
            <div className="landing-steps">
              {[
                {
                  title: "Make it your board.",
                  description:
                    "Create a home for your project. Give it a name, add your columns, and make it feel like you.",
                  icon: LayoutGrid,
                },
                {
                  title: "Get the ideas out.",
                  description:
                    "Turn thoughts into tasks. Add the details, set due dates, and decide what comes next.",
                  icon: MessageSquare,
                },
                {
                  title: "Move forward, together.",
                  description:
                    "Invite your team, share the responsibility, and watch the little wins add up.",
                  icon: Users,
                },
              ].map((step, index) => (
                <article key={step.title}>
                  <div className="landing-step-top">
                    <span>0{index + 1}</span>
                    <step.icon size={24} />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              ))}
            </div>
            <div className="landing-together">
              <PreviewAvatars />
              <p>
                For solo thinkers, small teams, and big plans.
                <br />
                <span>There’s room for the way you work.</span>
              </p>
              <Link to="/register">
                Make yourself at home
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section
          id="questions"
          className="landing-faq landing-section"
          aria-labelledby="faq-title"
        >
          <div className="landing-container landing-faq-layout">
            <div>
              <span className="landing-eyebrow">
                A few things you might ask
              </span>
              <h2 id="faq-title">
                A little more
                <br /> clarity.
              </h2>
              <p>Get to know your next workspace.</p>
              <span className="landing-faq-decoration" aria-hidden="true">
                ✳
              </span>
            </div>
            <Accordion type="single" collapsible className="landing-accordion">
              {questions.map((item, index) => (
                <AccordionItem value={`question-${index}`} key={item.question}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="landing-final-wrap">
          <div className="landing-final landing-container">
            <span className="landing-final-spark" aria-hidden="true">
              ✳
            </span>
            <span className="landing-eyebrow">
              Less scattered. More started.
            </span>
            <h2>
              Your next big thing
              <br />
              starts with a little space.
            </h2>
            <p>Make room for the ideas you can’t stop thinking about.</p>
            <Link
              to="/register"
              className="landing-button landing-button-white"
            >
              Let’s make it happen
              <ArrowRight size={17} />
            </Link>
            <span className="landing-final-note">
              Your ideas. Your people. One shared place.
            </span>
          </div>
        </section>
      </main>

      <footer className="landing-footer landing-container">
        <div className="landing-footer-top">
          <div>
            <LandingBrand />
            <p>A little clarity for your next big thing.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#questions">FAQs</a>
            <Link to="/login">
              Sign in
              <ArrowRight size={13} />
            </Link>
          </nav>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} Sticky Mind Grid</span>
          <span>
            Made for minds that keep moving.<span aria-hidden="true">✦</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
      <path
        d="m3 5 3 3 3-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
