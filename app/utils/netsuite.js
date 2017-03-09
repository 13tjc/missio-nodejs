var request = require('superagent');
var util = require('util');
var moment = require('moment');

function NetSuite(nlauth_account, nlauth_email, nlauth_signature) {
    this.url = 'https://rest.na1.netsuite.com/app/site/hosting/restlet.nl';
    this.headers = {'Content-Type': 'application/json', 'Authorization': util.format('NLAuth nlauth_account=%s, nlauth_email=%s, nlauth_signature=%s', nlauth_account, nlauth_email, nlauth_signature)};
    this.query = {'script': 9, 'deploy': 2};
}

NetSuite.prototype.createProject = function (project, done) {
    var jsonBody = {
        params: {
            program_total: project.project_cost,
            externalid: project.project_no,
            project_name: project.project_name,
            start_date: moment(project.published_date).add(1, 'days').format('MM/DD/YYYY')
        },
        call: "add_project"
    }
    request.post(this.url).set(this.headers).query(this.query).send(jsonBody).end(function (err, response) {
        if (err)
            return done(err);
        done(response.body);
    })
}

NetSuite.prototype.updateProject = function (project, done) {
    if (!project.nsId) return this.createProject(project, done);
    var jsonBody = {
        params: {
            id: project.nsId,
            program_total: project.project_cost,
            project_name: project.project_name,
            start_date: moment(project.published_date).add(1, 'days').format('MM/DD/YYYY')
        },
        call: "edit_project"
    }
    request.put(this.url).set(this.headers).query(this.query).send(jsonBody).end(function (err, response) {
        if (err)
            return done(err);
        done(response.body);
    })
}

NetSuite.prototype.addDonor = function (userInfo, billingInfo, done) {
    var jsonBody = {
        call: "add_donor",
        params: {
            externalid: userInfo.id,
            first_name: userInfo.firstName,
            last_name: userInfo.lastName,
            email: userInfo.email,
            companyname: userInfo.fullName,
            country: billingInfo.req_bill_to_address_country,
            addr1: billingInfo.req_bill_to_address_line1,
            addr2: billingInfo.req_bill_to_address_line2,
            city: billingInfo.req_bill_to_address_city,
            state: billingInfo.req_bill_to_address_state,
            zip: billingInfo.req_bill_to_address_postal_code,
            payment_info: billingInfo.payment_token
        }
    };

    request.post(this.url).set(this.headers).query(this.query).send(jsonBody).end(function (err, response) {
        if (err)
            return done(err);
        done(response.body);
    });
};

NetSuite.prototype.editDonor = function (userInfo, billingInfo, done) {
    if (!userInfo.nsId) return this.addDonor(userInfo, billingInfo, done);
    var jsonBody = {
        call: "edit_donor",
        params: {
            id: userInfo.nsId,
            first_name: userInfo.firstName,
            last_name: userInfo.lastName,
            email: userInfo.email,
            companyname: userInfo.fullName,
            country: billingInfo.req_bill_to_address_country,
            addr1: billingInfo.req_bill_to_address_line1,
            addr2: billingInfo.req_bill_to_address_line2,
            city: billingInfo.req_bill_to_address_city,
            state: billingInfo.req_bill_to_address_state,
            zip: billingInfo.req_bill_to_address_postal_code,
            payment_info: billingInfo.payment_token
        }
    };

    request.post(this.url).set(this.headers).query(this.query).send(jsonBody).end(function (err, response) {
        if (err)
            return done(err);
        done(response.body);
    });
};

NetSuite.prototype.addDonation = function (donationObj, done) {
    if (!donationObj.userNSID || !donationObj.projectNSID) return done('Server error.');
    var jsonBody = {
        call: "add_donation",
        params: {
            donor: donationObj.userNSID,
            project: donationObj.projectNSID,
            donation: donationObj.donation_amount,
            missio_fund: donationObj.generalFundAmount,
            admin_fee: donationObj.transactionFee
        }
    };
console.log('call addDonation')
    request.post(this.url).set(this.headers).query(this.query).send(jsonBody).end(function (err, response) {
        console.log('return addDonation', err, response)
        if (err)
            return done(err);
        done(null, response.body);
    });
};

NetSuite.prototype.getDonation = function (donationId, done) {
    if (!donationId) return done('Server error.');
    var jsonBody = {
        call: "donation_details",
        id: donationId
    };

    request.post(this.url).set(this.headers).query(this.query).send(jsonBody).end(function (err, response) {
        if (err)
            return done(err);
        done(null, response.body);
    });
};

NetSuite.prototype.shareProject = function (shareObj, done) {
    var jsonBody = {
        call: "send_project_share",
        params: {
            project_image: shareObj.projectImage,
            email: shareObj.email,
            project_title: shareObj.projectTitle,
            sender_first_name: shareObj.senderFirstName,
            sender_last_name: shareObj.senderLastName,
            path: shareObj.path
        }
    };

    request.post(this.url).set(this.headers).query(this.query).send(jsonBody).end(function (err, response) {
        if (err)
            return done(err);
        done(null, response.body);
    });
};



module.exports = new NetSuite(3972403, 'integration@propfaith.org', 'bisHop!79S');
