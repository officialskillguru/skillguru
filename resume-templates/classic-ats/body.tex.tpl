%-------------------------
% Resume in Latex
% Author : Jake Gutierrez
% Based off of: https://github.com/sb2nov/resume
% License : MIT
%------------------------
% Skill Guru integration (approved template "classic-ats"):
%  - Preamble and styling are the supplied original (_originals/resume-template-4.tex).
%  - Heading rows use tabularx (X column) instead of tabular* (l column) so long
%    titles wrap instead of running off the page. Visual layout is otherwise unchanged.
%  - ATS fix: added \usepackage[T1]{fontenc} + lmodern (Latin Modern, visually Computer
%    Modern). With the original OT1 encoding "_" is drawn as a rule and accented letters
%    are composed glyphs, so emails like first_last@... and names like Zoe-with-umlaut
%    did not survive PDF text extraction.
%  - Student data is inserted only through escaped << >> markers.
%------------------------

\documentclass[letterpaper,11pt]{article}

\usepackage[T1]{fontenc}
\usepackage{lmodern}
\usepackage{latexsym}
\usepackage[empty]{fullpage}
\usepackage{titlesec}
\usepackage{marvosym}
\usepackage[usenames,dvipsnames]{color}
\usepackage{verbatim}
\usepackage{enumitem}
\usepackage[hidelinks]{hyperref}
\usepackage{fancyhdr}
\usepackage[english]{babel}
\usepackage{tabularx}
\input{glyphtounicode}

\pagestyle{fancy}
\fancyhf{} % clear all header and footer fields
\fancyfoot{}
\renewcommand{\headrulewidth}{0pt}
\renewcommand{\footrulewidth}{0pt}

% Adjust margins
\addtolength{\oddsidemargin}{-0.5in}
\addtolength{\evensidemargin}{-0.5in}
\addtolength{\textwidth}{1in}
\addtolength{\topmargin}{-.5in}
\addtolength{\textheight}{1.0in}

\urlstyle{same}

\raggedbottom
\raggedright
\setlength{\tabcolsep}{0in}

% Sections formatting
\titleformat{\section}{
  \vspace{-4pt}\scshape\raggedright\large
}{}{0em}{}[\color{black}\titlerule \vspace{-5pt}]

% Ensure that generate pdf is machine readable/ATS parsable
\pdfgentounicode=1

%-------------------------
% Custom commands
\newcommand{\resumeItem}[1]{
  \item\small{
    {#1 \vspace{-2pt}}
  }
}

\newcommand{\resumeSubheading}[4]{
  \vspace{-2pt}\item
    \begin{tabularx}{0.97\textwidth}[t]{@{}>{\raggedright\arraybackslash}X@{\hspace{1em}}r@{}}
      \textbf{#1} & #2 \\
      \textit{\small#3} & \textit{\small #4} \\
    \end{tabularx}\vspace{-7pt}
}

\newcommand{\resumeProjectHeading}[2]{
    \item
    \begin{tabularx}{0.97\textwidth}{@{}>{\raggedright\arraybackslash}X@{\hspace{1em}}r@{}}
      \small#1 & #2 \\
    \end{tabularx}\vspace{-7pt}
}

\newcommand{\resumeSubItem}[1]{\resumeItem{#1}\vspace{-4pt}}

\renewcommand\labelitemii{$\vcenter{\hbox{\tiny$\bullet$}}$}

\newcommand{\resumeSubHeadingListStart}{\begin{itemize}[leftmargin=0.15in, label={}]}
\newcommand{\resumeSubHeadingListEnd}{\end{itemize}}
\newcommand{\resumeItemListStart}{\begin{itemize}}
\newcommand{\resumeItemListEnd}{\end{itemize}\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\begin{document}

%----------HEADING----------
\begin{center}
    \textbf{\Huge \scshape <<name>>} \\ \vspace{1pt}
<<#hasHeadline>>    \small <<headline>> \\ \vspace{1pt}
<</hasHeadline>>
<<#hasContactItems>>    \small <<#contactItems>><<#notFirst>> $|$ <</notFirst>><<#hasUrl>>\href{<<url>>}{\underline{<<text>>}}<</hasUrl>><<^hasUrl>><<text>><</hasUrl>><</contactItems>>
<</hasContactItems>>
\end{center}

<<#hasSummary>>
%-----------SUMMARY-----------
\section{Summary}
<<#summaryParagraphs>>\small{<<.>>}\par
<</summaryParagraphs>>
<</hasSummary>>

<<#hasObjective>>
\section{Career Objective}
\small{<<objective>>}\par
<</hasObjective>>

<<#hasEducation>>
%-----------EDUCATION-----------
\section{Education}
  \resumeSubHeadingListStart
<<#education>>
    \resumeSubheading
      {<<institution>>}{<<location>>}
      {<<degreeLine>>}{<<dates>>}
<<#hasExtras>>
      \resumeItemListStart
<<#score>>        \resumeItem{<<score>>}
<</score>>
<<#coursework>>        \resumeItem{Relevant coursework: <<coursework>>}
<</coursework>>
<<#details>>        \resumeItem{<<.>>}
<</details>>
      \resumeItemListEnd
<</hasExtras>>
<</education>>
  \resumeSubHeadingListEnd
<</hasEducation>>

<<#hasExperience>>
%-----------EXPERIENCE-----------
\section{Experience}
  \resumeSubHeadingListStart
<<#experience>>
    \resumeSubheading
      {<<title>>}{<<dates>>}
      {<<organization>>}{<<location>>}
<<#hasListItems>>
      \resumeItemListStart
<<#bullets>>        \resumeItem{<<.>>}
<</bullets>>
<<#hasTechnologies>>        \resumeItem{\textit{Technologies:} <<technologies>>}
<</hasTechnologies>>
      \resumeItemListEnd
<</hasListItems>>
<</experience>>
  \resumeSubHeadingListEnd
<</hasExperience>>

<<#hasInternships>>
%-----------INTERNSHIPS-----------
\section{Internships}
  \resumeSubHeadingListStart
<<#internships>>
    \resumeSubheading
      {<<title>>}{<<dates>>}
      {<<organization>>}{<<location>>}
<<#hasListItems>>
      \resumeItemListStart
<<#bullets>>        \resumeItem{<<.>>}
<</bullets>>
<<#hasTechnologies>>        \resumeItem{\textit{Technologies:} <<technologies>>}
<</hasTechnologies>>
      \resumeItemListEnd
<</hasListItems>>
<</internships>>
  \resumeSubHeadingListEnd
<</hasInternships>>

<<#hasProjects>>
%-----------PROJECTS-----------
\section{Projects}
    \resumeSubHeadingListStart
<<#projects>>
      \resumeProjectHeading
          {\textbf{<<name>>}<<#hasTechnologies>> $|$ \emph{<<technologies>>}<</hasTechnologies>>}{<<#hasRepoUrl>>\href{<<repoUrl>>}{\underline{<<repoDisplay>>}}<</hasRepoUrl>><<#hasLiveUrl>><<#hasRepoUrl>> $|$ <</hasRepoUrl>>\href{<<liveUrl>>}{\underline{<<liveDisplay>>}}<</hasLiveUrl>>}
<<#hasBullets>>
          \resumeItemListStart
<<#bullets>>            \resumeItem{<<.>>}
<</bullets>>
          \resumeItemListEnd
<</hasBullets>>
<</projects>>
    \resumeSubHeadingListEnd
<</hasProjects>>

<<#hasSkills>>
%-----------TECHNICAL SKILLS-----------
\section{Technical Skills}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{
<<#skills>><<#notFirst>> \\
<</notFirst>>     \textbf{<<category>>}{: <<items>>}<</skills>>
    }}
 \end{itemize}
<</hasSkills>>

<<#hasCertifications>>
%-----------CERTIFICATIONS-----------
\section{Certifications}
    \resumeSubHeadingListStart
<<#certifications>>
      \resumeProjectHeading
          {\textbf{<<name>>}<<#issuer>> $|$ \emph{<<issuer>>}<</issuer>>}{<<date>>}
<<#hasCredentialLine>>
          \resumeItemListStart
            \resumeItem{<<#credentialId>>Credential ID: <<credentialId>><</credentialId>><<#hasCredentialUrl>><<#credentialId>> $|$ <</credentialId>>\href{<<credentialUrl>>}{\underline{<<credentialDisplay>>}}<</hasCredentialUrl>>}
          \resumeItemListEnd
<</hasCredentialLine>>
<</certifications>>
    \resumeSubHeadingListEnd
<</hasCertifications>>

<<#hasAchievements>>
%-----------ACHIEVEMENTS-----------
\section{Achievements}
    \resumeSubHeadingListStart
<<#achievements>>
      \resumeProjectHeading
          {\textbf{<<title>>}<<#organization>> $|$ \emph{<<organization>>}<</organization>>}{<<date>>}
<<#hasDescription>>
          \resumeItemListStart
            \resumeItem{<<description>>}
          \resumeItemListEnd
<</hasDescription>>
<</achievements>>
    \resumeSubHeadingListEnd
<</hasAchievements>>

<<#hasLanguages>>
%-----------LANGUAGES-----------
\section{Languages}
 \begin{itemize}[leftmargin=0.15in, label={}]
    \small{\item{<<languagesLine>>}}
 \end{itemize}
<</hasLanguages>>

<<#additional>>
\section{<<heading>>}
    \resumeSubHeadingListStart
<<#items>>
      \resumeProjectHeading
          {\textbf{<<title>>}<<#organization>> $|$ \emph{<<organization>>}<</organization>>}{<<date>>}
<<#hasDescription>>
          \resumeItemListStart
            \resumeItem{<<description>>}
          \resumeItemListEnd
<</hasDescription>>
<</items>>
    \resumeSubHeadingListEnd
<</additional>>

%-------------------------------------------
\end{document}
