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
    d.IsNonDepreciable

FROM Assets a

    INNER JOIN Division43Assets d
    ON a.ID = d.ID