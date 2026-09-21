import math
def expected_power(wind, rated):
    if wind < 3 or wind >= 25: return 0.0
    if wind >= 11.5: return rated
    return rated * ((wind - 3) / 8.5) ** 3
def signed_angle(a, b): return (a-b+180)%360-180
def features(t):
    yaw = abs(signed_angle(t.wind_direction_deg, t.nacelle_direction_deg))
    residual = max(0, (t.expected_power_kw-t.power_kw)/max(t.expected_power_kw,1)*100)
    gearbox = min(99, max(2, (t.vibration_rms_mm_s-3.5)*18+(t.gearbox_temperature_c-60)*4))
    generator = min(99,max(2,(t.generator_temperature_c-72)*5+residual*.8))
    bearing = min(99,max(2,(t.bearing_temperature_c-57)*4+(t.vibration_rms_mm_s-3.5)*8))
    yaw_risk = min(99,yaw*3.2)
    risk = max(gearbox,generator,bearing,yaw_risk, residual*3.5)
    anomaly = min(99, risk*.72 + residual*.28)
    health = max(1,100-(risk*.48+anomaly*.16))
    return dict(yaw_error_deg=round(yaw,1), power_residual_pct=round(residual,1), gearbox_risk=round(gearbox,1), generator_risk=round(generator,1), bearing_risk=round(bearing,1), yaw_risk=round(yaw_risk,1), overall_failure_risk=round(risk,1), anomaly_score=round(anomaly,1), health_score=round(health,1))
