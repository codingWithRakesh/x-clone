const toggle = document.getElementById('togglePlan');
    const saveLabel = document.getElementById('saveLabel');

    const basicPrice = document.getElementById('basicPrice');
    const basicNote = document.getElementById('basicNote');
    const basicAdCredit = document.getElementById('basicAdCredit');

    const fullPrice = document.getElementById('fullPrice');
    const fullNote = document.getElementById('fullNote');
    const fullAdCredit = document.getElementById('fullAdCredit');

    function setMonthly() {
        saveLabel.style.display = 'none';

        basicPrice.innerHTML = '₹16,670<span style="font-size: 1rem; font-weight: normal; color: #71767b;">/month</span>';
        basicNote.textContent = 'Billed monthly';
        basicAdCredit.textContent = '$200 free monthly ad credit';

        fullPrice.innerHTML = '₹82,300<span style="font-size: 1rem; font-weight: normal; color: #71767b;">/month</span>';
        fullNote.textContent = 'Billed monthly';
        fullAdCredit.textContent = '$1,000 free monthly ad credit';
    }

    function setYearly() {
        saveLabel.style.display = 'inline';
        saveLabel.classList.add('highlight');
        setTimeout(() => saveLabel.classList.remove('highlight'), 1000);

        basicPrice.innerHTML = '₹14,000<span style="font-size: 1rem; font-weight: normal; color: #71767b;">/month</span>';
        basicNote.textContent = '₹168,000 Billed annually';
        basicAdCredit.textContent = '$2,500 free ad credit';

        fullPrice.innerHTML = '₹69,125<span style="font-size: 1rem; font-weight: normal; color: #71767b;">/month</span>';
        fullNote.textContent = '₹829,500 Billed annually';
        fullAdCredit.textContent = '$12,000 free ad credit';
    }

    toggle.addEventListener('change', () => {
        if (toggle.checked) {
            setYearly();
        } else {
            setMonthly();
        }
    });

    // Default: Yearly
    toggle.checked = true;
    setYearly();