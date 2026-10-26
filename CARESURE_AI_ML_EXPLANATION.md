# CareSure AI/ML Architecture & Implementation Guide
> **Document Purpose:** Complete team briefing and technical guide for CareSure's AI/ML components  
> **Project:** AI-Assisted Hospital Revenue Assurance and Claim Verification  
> **Target Audience:** Project Team Members, College Supervisor, and Evaluation Panel  

---

## 1. The Core Philosophy: Why a "Hybrid" System?

A common question asked by examiners and developers is:  
> *"Why can't we just write `if-else` rules? Or why not use pure Deep Learning / Large Language Models?"*

* **Why Rules Alone Fail:**  
  Hospital billing rules (like *"did a CT scan have a report?"*) are rigid. They cannot catch subtle, multi-dimensional anomalies—such as a hospital charging 30% more than usual across 15 separate small consumables, or keeping an appendectomy patient for 7 days without clinical need.
* **Why Pure AI Alone Fails:**  
  Machine learning models are statistical pattern matchers. If an ML model is 90% sure a claim is fine, but the hospital forgot to attach the patient’s mandatory discharge summary, the insurance auditor will reject it instantly. Strict medical compliance cannot rely on probabilistic guesses.
* **CareSure’s Solution:**  
  A **Deterministic Rule Engine + Unsupervised Anomaly Detection + Supervised Risk Classification**.  
  $$\text{Final Claim Score (0--100)} = \underbrace{\text{Rules Points (0--40)}}_{\text{Deterministic Checks}} + \underbrace{\text{ML Risk Points (0--35)}}_{\text{Audit Failure Likelihood}} + \underbrace{\text{Anomaly Points (0--25)}}_{\text{Outlier Deviation}}$$

---

## 2. The Two Algorithms Explained in Plain English

```
+-----------------------------------------------------------------------------------+
|                                  CLAIM INPUT                                      |
|  - Financial & Stay: Amount (Rs. 2,45,800), Length of Stay (4 days), Items (6)   |
|  - Clinical & Rules: Procedure (Appendectomy), Rules Fired (1), Unmatched (20%)   |
+-----------------------------------------------------------------------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
+-----------------------------------+   +-------------------------------------------+
| 1. ISOLATION FOREST               |   | 2. RANDOM FOREST / XGBOOST                |
| (Unsupervised Anomaly Detection)  |   | (Supervised Risk Classification)          |
| - Evaluates amount, LOS, & items  |   | - Combines clinical, billing, and rules   |
| - Compares against procedure norm |   | - Predicts probability of audit failure   |
| - Output: Anomaly Score (0.76)    |   | - Output: Risk Probability (0.80)         |
+-----------------------------------+   +-------------------------------------------+
         |                                                   |
         v                                                   v
+-----------------------------------+   +-------------------------------------------+
| 19 Anomaly Points (0.76 * 25)     |   | 28 ML Risk Points (0.80 * 35)             |
| Reason: Amount is 2.4x the median |   | Top Drivers: Unmatched ratio, Amount      |
+-----------------------------------+   +-------------------------------------------+
         |                                                   |
         +-------------------------+-------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------------------+
|               NODE.JS SCORING ENGINE (backend/src/services/scoring.ts)            |
|       Rules (25) + ML Risk (28) + Anomaly (19) = 72 / 100 (HIGH RISK SIGNALS)     |
+-----------------------------------------------------------------------------------+
```

### Algorithm 1: Isolation Forest (Unsupervised Anomaly Detection)
* **What is its job?**  
  To detect when a claim looks abnormal compared to normal medical practice for that specific procedure—even if no explicit rule was broken.
* **How it works conceptually:**  
  Isolation Forest builds random decision trees to isolate individual data points. Normal claims (e.g., standard ₹90,000 appendectomies with a 3-day stay) require many recursive cuts to isolate. Outlier claims (e.g., ₹2,45,800 appendectomy with a 7-day stay) stand out in sparse regions and get isolated very quickly (shallow tree depth).
* **Inputs:** 
  1. `amount` (total billed amount in Rupees)
  2. `length_of_stay` (days in hospital: discharge date minus admission date)
  3. `items_billed` (count of line items on invoice)
  4. Segmented by `procedure` (e.g., Appendectomy vs. Angioplasty)
* **Output:**  
  A normalized `anomaly_score` between $0.0$ (completely normal) and $1.0$ (extreme outlier).

---

### Algorithm 2: Random Forest / XGBoost (Supervised Classification)
* **What is its job?**  
  To predict the **probability of an audit rejection** based on all combined features.
* **How it works conceptually:**  
  An ensemble of decision trees trained on thousands of claims where we already know whether the claim was approved or rejected/disputed. It looks at complex interactions: for instance, *a high bill is acceptable for a complex 6-day stay, but a high bill combined with unmatched procedure codes and 1 rule failure is a 95% audit risk*.
* **Inputs:**
  1. Clinical ratios: `amount_to_procedure_median`, `amount_per_day`
  2. Audit signals: `rules_fired` (how many deterministic rules fired: 0 to 6)
  3. Discrepancy signals: `unmatched_ratio` (percentage of billing items that don't match clinical records)
* **Output:**  
  A calibrated `risk_probability` between $0.0$ and $1.0$.

---

### The Explainability Layer (Why Auditors Trust It)
Doctors and hospital finance leads will **never** accept a screen that just says *"Risk: 80%"* without a reason.  
Our service pairs every score with a human-readable attribution:
* Calculates the Z-score/percentile deviation against benchmark distributions:
  * *"Amount ₹2,45,800 is 2.40x the benchmark median for Appendectomy (₹1,02,500)."*
  * *"Daily billing density is higher than the 95th percentile."*
  * *"Top driving risk factor: unmatched procedure ratio (20%)."*

---

## 3. On What Data Do We Train?

### Why Synthetic Data?
Real Electronic Health Records (EHR) and hospital billing databases are strictly protected by **HIPAA, GDPR, and Indian Digital Personal Data Protection Act (DPDP)**. Real hospital claim fraud data is rarely public.

### Our Strategy: Synthea + Controlled Error Injection
1. **Clinical Baseline:**  
   We use the open-source **Synthea** and **CMS SynPUF** schemas, which contain realistic synthetic clinical encounters (procedures, diagnoses, hospital admissions).
2. **Procedure Pricing Benchmarks:**  
   We define realistic Indian hospital procedure pricing distributions (seeded into MongoDB):
   * *Appendectomy:* Median ₹1,02,500 (IQR: ₹85k – ₹1.2L)
   * *Normal Delivery:* Median ₹45,000 (IQR: ₹35k – ₹55k)
   * *Cesarean Section:* Median ₹85,000 (IQR: ₹70k – ₹1.05L)
   * *Angioplasty / Stent:* Median ₹2,20,000 (IQR: ₹1.8L – ₹2.6L)
   * *Total Knee Replacement:* Median ₹3,10,000 (IQR: ₹2.6L – ₹3.6L)
3. **Controlled Error Injection Script (`generate_synthetic.py`):**  
   We synthesize **2,500 claims**:
   * **70% Clean Claims (1,750):** Normal bills matching clinical records. Label = `0` (Clean).
   * **30% Injected Audit Errors (750):** Label = `1` (Audit Risk). We inject the 6 real-world error types:
     * `R01`: CT/MRI billed but report missing.
     * `R02`: Duplicate billing line on the same date.
     * `R03`: Inflated cost (2x to 3.5x procedure median).
     * `R04`: Surgery performed but missing billing line (revenue leakage).
     * `R05`: Date mismatch (service billed after discharge date).
     * `R06`: Missing discharge summary.
4. **Train / Test Split:**  
   * **70% Train (1,750 claims)** — Used strictly to fit the models.
   * **30% Test (750 claims)** — Kept untouched to evaluate unbiased metrics (**ROC-AUC, Precision, Recall, F1**).

---

## 4. How the Math Produces the "Hero Claim" (72 / 100)

In your project demo, you present the **Hero Claim** (`CLM-2026-1041`): a patient admitted for an **Appendectomy** with a bill of **₹2,45,800**.

Here is how the pipeline calculates its score step-by-step:

| Stage | Input Evaluated | Engine / Algorithm | Points Formula | Points Earned |
| :--- | :--- | :--- | :--- | :--- |
| **1. Rules** | CT Scan Abdomen billed, but diagnostic report is missing | Deterministic Rule `R01` | Fixed points (capped at 40) | **25** |
| **2. ML Risk** | Billed ₹2,45,800 + 1 rule fired + 20% unmatched items | Random Forest Classifier | $\text{round}(0.80 \times 35)$ | **28** |
| **3. Anomaly** | ₹2,45,800 vs. Appendectomy median ₹1,02,500 | Isolation Forest Outlier Score | $\text{round}(0.76 \times 25)$ | **19** |
| **Total Score** | | | **$25 + 28 + 19$** | **$\mathbf{72 / 100}$** |

Because the score is $\ge 70$, it gets categorized as **High Risk Signals (Red Badge)** and is automatically pushed to the top of the **Review Queue** for an insurance auditor to review.

---

## 5. How It Connects to the Node.js Backend

1. **Python Microservice (`ai-service` on port 8000):**
   * Built with **FastAPI**.
   * Models are loaded into memory once on startup.
   * Exposes two lightweight JSON endpoints:
     * `POST http://localhost:8000/anomaly`
     * `POST http://localhost:8000/ml-risk`
   * Secured by an internal secret token: `X-Service-Token`.
2. **Node.js Express Backend (on port 5000):**
   * Whenever a claim is submitted or validated, `backend/src/services/aiClient.ts` fires HTTP calls to the Python service.
   * Combines the Python response with the rule engine output in `backend/src/services/scoring.ts`.
3. **Resilient Offline Fallback:**
   * If the Python AI service is turned off or crashes, the Node.js backend **does not crash**.
   * It catches the timeout, scores using the Rule Engine ($25$ points), sets `aiSignalsAvailable: false`, and automatically enforces human review so no claim slips through unverified.

---

## 6. Quick Cheat Sheet for Team Discussions / Viva Questions

> **Q: Where will the model be trained? On Google Colab or locally?**  
> **A:** **Locally on your CPU**. Because we are training tabular tree models (Isolation Forest + Random Forest) on 2,500 records rather than deep neural networks, the entire training pipeline runs in **under 20 seconds** on any standard laptop without requiring GPUs.

> **Q: Why not use a Deep Neural Network (MLP / LSTM)?**  
> **A:** For tabular medical billing data with numerical and categorical features, gradient boosted trees and Random Forests consistently outperform deep networks in both accuracy and sample efficiency (proven across Kaggle and healthcare research benchmarks). They also provide immediate feature importances for auditor explainability.

> **Q: What evaluation metrics will you present to the examiner?**  
> **A:** 
> 1. **ROC-AUC & F1-Score** (not just simple accuracy, because fraud/anomalies are naturally class-imbalanced).
> 2. **Ablation Study:** We compare `Rules Only` vs. `Rules + Anomaly` vs. `Hybrid (Rules + ML + Anomaly)` to mathematically prove that the hybrid system detects more billing leakage with fewer false alarms.
