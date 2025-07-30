SELECT
    a.ID,
    a.ReportID,
    a.AssetTemplateID,
    a.Name,
    a.Area,
    a.IsGivenCost,
    a.RateFormula,
    a.QuantityFormula,
    a.InstallationDateFormula,
    a.ScrappedDateFormula,
    d.IsDivision43Deduction,
    d.HundredPercentOption,
    d.NumberOfItems,
    d.CanHundredPercent,
    d.ExcludeExpenditure,
    d.ExcludeFees

FROM Assets a

    INNER JOIN Division40Assets d
    ON a.ID = d.ID