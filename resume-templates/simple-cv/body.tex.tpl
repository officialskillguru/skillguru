%------------------------
% Skill Guru integration (template "simple-cv"):
%  - Preamble is the supplied original (_originals/resume-template-2.tex), pdfLaTeX branch.
%  - The original \textBF placed text in an unbreakable \resizebox (same size, link colour),
%    so long degree/job lines overflowed the page. It is redefined below as the same colour
%    without the box, which looks identical but wraps. The lorem-ipsum macro is removed.
%  - Added: glyphtounicode + \pdfgentounicode (reliable ATS text extraction) and enumitem
%    (compact bullet lists for descriptions). The xelatex branch is omitted (pdfLaTeX only).
%  - No author or licence was included with this template. It stays hidden from students
%    (license.commercialUseReviewed = false in registry.json) until its licence is confirmed.
%  - Student data is inserted only through escaped << >> markers.
%------------------------
\documentclass[a4paper,11pt]{article}
\usepackage[bottom=0.8in,top=0.8in, left=0.8in,right=0.8in]{geometry}

% non-numbered pages
\pagestyle{empty}

%%%%%%%%%%% pdflatex %%%%%%%%%
\usepackage[T1]{fontenc}
\usepackage{newtxmath,newtxtext}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%

%A Few Useful Packages
\usepackage{parskip}
\usepackage{titlesec}
\usepackage{multirow}
\usepackage{graphicx}
\usepackage[usenames,dvipsnames]{xcolor}
\usepackage{hyperref}
\usepackage{enumitem}
\definecolor{linkcolour}{rgb}{0,0.2,0.6}
\hypersetup{colorlinks,breaklinks,urlcolor={linkcolour!90}, linkcolor={linkcolour!90}}

% Text extraction for ATS parsers
\input{glyphtounicode}
\pdfgentounicode=1

% line spacing
\linespread{1.1}

% section reformatting
\titleformat{\section}{\color{black} \large}{}{0em}{}[\color{black}]
\titlespacing{\section}{0pt}{3pt}{3pt}

\newcommand{\sectitle}[1]{
    \vspace{1.5ex}
    \section{#1}
    \vspace{-3ex}
    \noindent\rule{\textwidth}{0.7pt}
    \vspace{-4ex}
}

% new text bold style (same colour as the original \textBF, but breakable)
\newcommand{\textBF}[1]{\textcolor{linkcolour}{#1}}
\parindent=0pt

% compact bullet lists for descriptions
\setlist[itemize]{leftmargin=1.2em, topsep=0pt, itemsep=0pt, parsep=0pt}

%-------------------- Begin document ----------------------
\begin{document}

%-------------------- Title section ----------------------
\begin{minipage}{\textwidth}
    \vspace{7ex}
        \par{
        \centering
        \vspace{-0.9in}
            \textcolor{linkcolour}{\Large <<name>>}
        \par}
\end{minipage}

%-------------------- Header ----------------------
\begin{center}
<<#hasHeadline>>    <<headline>> \\
<</hasHeadline>>
<<#contactItems>><<#notFirst>> \,$\cdot$\, <</notFirst>><<#hasUrl>>\href{<<url>>}{<<text>>}<</hasUrl>><<^hasUrl>><<text>><</hasUrl>><</contactItems>>
\end{center}

%%% Short paragraph
<<#summaryParagraphs>><<.>>\par
<</summaryParagraphs>>
<<#hasObjective>><<objective>>\par
<</hasObjective>>

%-------------------- SECTIONS ----------------------

<<#hasSkills>>
\sectitle{Technical Skills}

<<#skills>>\textBF{<<category>>} --- <<items>>

<</skills>>
<</hasSkills>>

<<#hasAnyExperience>>
\sectitle{Positions}

<<#allExperience>>\textBF{<<title>>}<<#organization>> --- <<organization>><</organization>><<#location>>, <<location>><</location>> \hfill <<dates>>
<<#hasListItems>>
\begin{itemize}
<<#bullets>>\item <<.>>
<</bullets>>
<<#hasTechnologies>>\item \textit{Technologies:} <<technologies>>
<</hasTechnologies>>
\end{itemize}
<</hasListItems>>

<</allExperience>>
<</hasAnyExperience>>

<<#hasProjects>>
\sectitle{Projects}

<<#projects>>\textBF{<<name>>}<<#hasTechnologies>> --- \textit{<<technologies>>}<</hasTechnologies>><<#hasRepoUrl>> \hfill \href{<<repoUrl>>}{<<repoDisplay>>}<</hasRepoUrl>><<#hasLiveUrl>><<^hasRepoUrl>> \hfill<</hasRepoUrl>><<#hasRepoUrl>> \,$\cdot$\,<</hasRepoUrl>> \href{<<liveUrl>>}{<<liveDisplay>>}<</hasLiveUrl>>
<<#hasBullets>>
\begin{itemize}
<<#bullets>>\item <<.>>
<</bullets>>
\end{itemize}
<</hasBullets>>

<</projects>>
<</hasProjects>>

<<#hasEducation>>
\sectitle{Education}

<<#education>>\textBF{<<degreeLine>>}<<#institution>> -- {<<institution>>}<</institution>><<#location>>, <<location>><</location>> \hfill {<<dates>>}
<<#hasExtras>>
\begin{itemize}
<<#score>>\item <<score>>
<</score>>
<<#coursework>>\item Relevant coursework: <<coursework>>
<</coursework>>
<<#details>>\item <<.>>
<</details>>
\end{itemize}
<</hasExtras>>

<</education>>
<</hasEducation>>

<<#hasCertifications>>
\sectitle{Certifications}

<<#certifications>>\textBF{<<name>>}<<#issuer>> --- <<issuer>><</issuer>> \hfill <<date>><<#hasCredentialLine>>\\
<<#credentialId>>Credential ID: <<credentialId>><</credentialId>><<#hasCredentialUrl>><<#credentialId>> \,$\cdot$\, <</credentialId>>\href{<<credentialUrl>>}{<<credentialDisplay>>}<</hasCredentialUrl>><</hasCredentialLine>>

<</certifications>>
<</hasCertifications>>

<<#hasAchievements>>
\sectitle{Achievements}

<<#achievements>>\textBF{<<title>>}<<#organization>> --- <<organization>><</organization>> \hfill <<date>><<#hasDescription>>\\
<<description>><</hasDescription>>

<</achievements>>
<</hasAchievements>>

<<#hasLanguages>>
\sectitle{Languages}

<<languagesLine>>
<</hasLanguages>>

<<#additional>>
\sectitle{<<heading>>}

<<#items>>\textBF{<<title>>}<<#organization>> --- <<organization>><</organization>> \hfill <<date>><<#hasDescription>>\\
<<description>><</hasDescription>>

<</items>>
<</additional>>

\end{document}
