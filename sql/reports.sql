SELECT
    r.ID,
    pt.Type,
    Reference,
    ReportDate,
    Settlement,
    ConstructionCompletion,
    CommonEntitlementFormula,
    PurchasePrice,
    LandValue,
    PreliminaryFees,
    ConsultancyFees,
    PreNotionalWriteDownYears,
    NotionalWriteDownRate,
    NotionalWriteDownGovernor,
    ExpenditureGovernor,
    NumberOfLevels,
    NumberOfUnits,
    NumberOfYearsToBackClaim,
    CouncilName,
    StrataPlanProvider,
    WrittenAndVerbalInformationProvidedBy,
    VerbalInformationProvidedBy,
    WrittenInformationProvidedBy,
    Line1,
    Line2,
    Line3,
    Suburb,
    [State],
    Postcode,
    AvailableFirstUseFormula,
    YearsInSchedule,
    IsBrandNew
FROM Reports r

    INNER JOIN PropertyTypes pt
    ON r.PropertyTypeID = pt.ID

ORDER BY r.ID DESC