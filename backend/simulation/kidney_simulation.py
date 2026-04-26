def simulate_kidney(bp, creatinine, hydration):

    gfr = 120 - (creatinine * 30)

    if bp > 140:
        gfr -= 10

    if hydration == "Low":
        gfr -= 5

    if hydration == "High":
        gfr += 5

    if gfr > 90:
        state = "Healthy"

    elif gfr > 60:
        state = "Moderate Stress"

    else:
        state = "Kidney Damage"

    return gfr, state