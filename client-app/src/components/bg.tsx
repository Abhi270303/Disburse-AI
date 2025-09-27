import React from "react";

const Background = () => {
  return (
    <>
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-accent/5 pointer-events-none" />
      <div className="fixed top-[-200px] right-[-200px] w-[600px] h-[600px] bg-foreground/5 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-200px] left-[-200px] w-[600px] h-[600px] bg-accent/10 blur-3xl pointer-events-none" />
    </>
  );
};

export default Background;
