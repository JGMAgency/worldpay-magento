window.WorldpayIntegrationMode = 'template';

/**
 * Wrapper for the WorldPay formBuilder
 * - removes elements if they already exist before adding them
 *
 * @see Worldpay.formBuilder
 *
 * @param form
 * @param element
 * @param type
 * @param name
 * @param value
 * @param id
 */
function addFormElement(form, element, type, name, value, id) {
    var selector = element + '[name="' + name + '"]';
    if ($$(selector).size() > 0) {
        form.removeChild($$(selector)[0]);
    }
    Worldpay.formBuilder(form, element, type, name, value, id);
}

function loadUpWP() {
    WorldpayMagentoVersion = '1.5.0';
    var form;
    var cachedOnsubmit;
    var isPostForm = false;
    var selectedExisitingCard = false;

    var isOnePageCheckout = true;

    var magentoCheckoutButton;

    if (!window.checkout) {
        isOnePageCheckout =  false;
    }

    if (document.getElementById('review-button')) {
        isOnePageCheckout =  false;
        document.getElementById('review-button').setAttribute('onclick', 'return window.WorldpayMagento.checkoutThreeDS(event)');
    } else {

        if (document.getElementById('multishipping-billing-form')) {


            Event.observe(window, 'load', function() {

                form = document.getElementById('multishipping-billing-form');

                $('payment-continue').setAttribute('onclick', 'window.WorldpayMagento.submitCard()');

                if (window.WorldpayIntegrationMode == 'ownForm') {
                    Worldpay.useForm(form, function (status, response) {
                        handleWorldpayErrors(status, response, function(message) {
                            document.getElementById('worldpay-payment-errors').style.display = 'none';
                            var token = message.token;
                            addFormElement(form, 'input', 'hidden', 'payment[token]', token);
                            form.submit();
                        });
                    });
                } else {
                    Worldpay.useTemplate('multishipping-billing-form', 'worldpay-iframe', 'inline', function(message) {
                        var token = message.token;
                        addFormElement(form, 'input', 'hidden', 'payment[token]', token);
                        form.submit();
                    });
                }
                isPostForm = true;
            });
        }
        else if (document.getElementById('co-payment-form')) {

           form = document.getElementById('co-payment-form');

            if (window.WorldpayIntegrationMode != 'ownForm') {
                Worldpay.useTemplate('co-payment-form', 'worldpay-iframe', 'inline', function(message) {
                    var token = message.token;
                    addFormElement(form, 'input', 'hidden', 'payment[token]', token);
                    payment.save();
                });
            }

            form.submit = function() {};

            if ($$('#payment-buttons-container button')[0]) {
                magentoCheckoutButton = '#payment-buttons-container button';
            } else if ($$('#checkout-review-submit button.btn-checkout')[0]) {
                // Need to target more precisely to avoid picking up IWN OnePageCheckout modal-agreement buttons
                magentoCheckoutButton = '#checkout-review-submit button.btn-checkout';
            } else if ($$('#checkout-review-submit button')[0]) {
                magentoCheckoutButton = '#checkout-review-submit button';
            }

            if (typeof $$(magentoCheckoutButton)[0] == 'undefined') {
                // unable to find magentoCheckoutButton
                return;
            }

            if ($('payment_form_worldpay_cc')) {
                 Event.observe($('payment_form_worldpay_cc'), 'payment-method:switched-off', function(event){
                    selectedExisitingCard = true;
                    $$(magentoCheckoutButton)[0].setAttribute('onclick', 'payment.save()');
                });

                Event.observe($('payment_form_worldpay_cc'), 'payment-method:switched', function(event){
                    selectedExisitingCard = false;
                    $$(magentoCheckoutButton)[0].setAttribute('onclick', 'window.WorldpayMagento.submitCard()');
                });
            }

            isPostForm = false;
        }
        if (document.getElementById('worldpay-newcard')) {

            var newCardChange = function(){
                if (this.checked) {
                    document.getElementById('new-worldpay-card').style.display = 'block';
                    document.getElementById('worldpay_existing_cvc_box').style.display = 'none';
                    selectedExisitingCard = false;
                     if (document.getElementById('co-payment-form')) {
                        $$(magentoCheckoutButton)[0].setAttribute('onclick', 'window.WorldpayMagento.submitCard()');
                    }
                    else {
                        if (cachedOnsubmit) {
                            form.onsubmit = cachedOnsubmit;
                        }
                    }
                }
            };

            if (document.getElementById('worldpay-newcard').addEventListener) {
                document.getElementById('worldpay-newcard').addEventListener("change", newCardChange, false);
            } else {
                document.getElementById('worldpay-newcard').attachEvent("change", newCardChange);
            }

            $$('.worldpay-savedcard-input').each(function(el) {

                el.observe('click', function(event){
                    selectedExisitingCard = true;
                    document.getElementById('new-worldpay-card').style.display = 'none';
                    $(el).insert({
                        after:document.getElementById('worldpay_existing_cvc_box')
                    });
                    document.getElementById('worldpay_existing_cvc_box').style.display = 'block';
                    if (document.getElementById('co-payment-form')) {
                         $$(magentoCheckoutButton)[0].setAttribute('onclick', 'window.WorldpayMagento.updateCVC()');
                    }
                    else {
                        if (form.onsubmit) {
                            cachedOnsubmit = form.onsubmit;
                        }
                        form.onsubmit = function(){return window.WorldpayMagento.updateCVC()};
                    }
                });
            });
        }

        function checkIfNewCard() {
            return !!getCheckedRadio(form.elements.savedcard);
        }

        function getCheckedRadio(radio_group) {
            for (var i = 0; i < radio_group.length; i++) {
                var button = radio_group[i];
                if (button.checked) {
                    return button;
                }
            }
            return undefined;
        }

        function handleWorldpayErrors(status, response, success) {
            if (response.error) {
                document.getElementById('worldpay-payment-errors').style.display = 'block';
                Worldpay.handleError(form, document.getElementById('worldpay-payment-errors'), response.error);
            } else if (status != 200) {
                document.getElementById('worldpay-payment-errors').style.display = 'block';
                if (!response.message) {
                    response.message = 'API error, please try again later';
                }
                Worldpay.handleError(form, document.getElementById('worldpay-payment-errors'), response);
            } else {
                success(response);
            }
        }
    }
    window.WorldpayMagento = {
        threeDSAuthorised: function() {
            document.body.removeChild(document.getElementById('worldpay-threeDsFrame'));
            if (isOnePageCheckout) {
                review.save();
            } else {
                document.getElementById('review-button').setAttribute('onclick', '');
                $('review-button').click();
            }
        },
        threeDSError: function(error, url) {
            if (!error) {
                error = '3DS Failed, please try again';
            }
            document.body.removeChild(document.getElementById('worldpay-threeDsFrame'));
            if (isOnePageCheckout) {
                checkout.gotoSection('payment', true);
            } else {
                if (url) {
                    window.location.href = url;
                }
            }
            alert(error);
        },
        loadThreeDS: function(url) {
            var iframeDiv =document.createElement('div');
            iframeDiv.id = 'worldpay-threeDsFrame';
            iframeDiv.style.display = 'none';
            iframeDiv.innerHTML = '<iframe width="100%" height="400px" src="'+ url +'"></iframe>';
            document.body.appendChild(iframeDiv);
        },
        updateCVC: function() {
            // Create form with cvc and token
            var cvcForm = document.createElement("form");

            var i = document.createElement("input");
            i.setAttribute('type',"text");
            i.setAttribute('data-worldpay', 'cvc');
            i.setAttribute('value', document.getElementById('worldpay_existing_cvc').value);

            var token = getCheckedRadio(form['payment[savedcard]']).value;

            var t = document.createElement("input");
            t.setAttribute('type',"text");
            t.setAttribute('data-worldpay', 'token');
            t.setAttribute('value', token);

            cvcForm.appendChild(i);
            cvcForm.appendChild(t);

            Worldpay.card.reuseToken(cvcForm, function(status, response) {
                handleWorldpayErrors(status, response, function(message) {
                    document.getElementById('worldpay-payment-errors').style.display = 'none';
                    if (isPostForm) {
                        form.submit();
                    }
                    else {
                        payment.save();
                    }
                });
            });
            return false;
        },
        checkoutThreeDS : function(e) {
            window.event.cancelBubble = true;
            event.stopPropagation();
            if (!window.wp_threeDSCompleteURL) {
                window.wp_threeDSCompleteURL = '/index.php/worldpay/threeDS/checkout/';
            }
            window.WorldpayMagento.loadThreeDS(window.wp_threeDSCompleteURL);
            return false;
        },
        completeCheckoutThreeDS: function(e) {
            document.body.removeChild(document.getElementById('worldpay-threeDsFrame'));
            document.getElementById('review-button').setAttribute('onclick', '');
            $('review-button').click();
        },
        showThreeDSIframe: function() {
            document.getElementById('worldpay-threeDsFrame').style.display = '';
        },
        createWorldpayToken: function() {
            if (selectedExisitingCard) {
                window.WorldpayMagento.updateCVC();
            }
            else {
                var validated = Worldpay.card.createToken(form, function(status, response) {
                    handleWorldpayErrors(status, response, function(message) {
                        document.getElementById('worldpay-payment-errors').style.display = 'none';
                        var token = message.token;
                        addFormElement(form, 'input', 'hidden', 'payment[token]', token);
                        if (isPostForm) {
                            form.submit();
                        }
                        else {
                            payment.save();
                        }
                    });
                });
                if (validated === false) {
                    return false;
                }
                else {
                    return true;
                }
            }
        },
        submitCard: function() {
            if (window.WorldpayIntegrationMode == 'ownForm') {
                window.WorldpayMagento.createWorldpayToken();
            } else {
                Worldpay.submitTemplateForm();
            }
        }
    };
}

if (!window.Worldpay) {
    document.observe('dom:loaded', function(){
        loadUpWP();
    });
} else {
    loadUpWP();
}
