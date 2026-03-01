function Loader({ fullScreen = false }) {
  return (
    <div
      className={`flex items-center justify-center ${
        fullScreen ? "min-h-[60vh]" : ""
      }`}
    >
      <div className="h-10 w-10 rounded-full border-4 border-slate-600 border-t-indigo-500 animate-spin"></div>
    </div>
  );
}

export default Loader;