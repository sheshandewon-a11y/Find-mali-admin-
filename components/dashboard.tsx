useEffect(() => {
  if (
    active === "Activity Logs" ||
    active === "Settings"
  ) {
    setData({});
    setLoading(false);
    setError("");
    return;
  }

  loadData(active);

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [active, inboxStatus, inboxPage]);
