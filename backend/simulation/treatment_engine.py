def treatment_simulation(gfr):

    if gfr > 90:
        return "Maintain hydration and balanced diet."

    elif gfr > 60:
        return "Medication + Reduce salt intake."

    elif gfr > 30:
        return "Nephrologist consultation required."

    else:
        return "Dialysis recommended."