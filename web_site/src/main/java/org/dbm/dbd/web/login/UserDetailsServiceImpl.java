package org.dbm.dbd.web.login;

import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;
import org.dbm.common.base.model.mongo.BaseMongoMap;
import org.dbm.dbd.dao.UserDao;

import java.util.ArrayList;
import java.util.List;

import static org.springframework.data.mongodb.core.query.Criteria.where;

/**
 * This class is being un-deprecated because we want the query for the customer to happen through Hibernate instead of
 * through raw JDBC, which is the case when <sec:jdbc-user-service /> is used. We need the query to go through Hibernate
 * so that we are able to attach the necessary filters in certain circumstances.
 * 
 * @author Andre Azzolini (apazzolini)
 * @author Phillip Verheyden (phillipuniverse)
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final Logger logger = LoggerFactory.getLogger(getClass());

    @Autowired
    private UserDao userDao;

    // 这里必须是注册用户
    @Override
    public UserDetails loadUserByUsername(String userAccount) {
        return loadUserByUsernameWithChkReg(userAccount, true, null);
    }

    /**
     * 根据登录帐号（已注册的）查询用户
     */
    public UserDetails loadUserByUsernameWithChkReg(String userAccount, boolean chkReg, String fromSrc) {
        Query queryObj = new Query(where("account").is(userAccount));
        queryObj.addCriteria(where("auditData.valid").is(true));
        queryObj.addCriteria(where("registered").is(chkReg));
        if (fromSrc != null) {
            queryObj.addCriteria(where("from").is(fromSrc));
        }

        queryObj.fields().include("account");
        queryObj.fields().include("userName");
        queryObj.fields().include("password");
        queryObj.fields().include("favorite");
        queryObj.fields().include("role");
        queryObj.fields().include("status");
        queryObj.fields().include("registered");
        queryObj.fields().include("from");
        BaseMongoMap employee = userDao.getMongoMap(queryObj);
        if (employee == null) {
            return null;
        }

        CustomerUserDetails userObj = new CustomerUserDetails(StringUtils.trimToNull((String) employee.get("userName")), (String) employee.get("password"),
                createGrantedAuthorities(userAccount, employee.getIntAttribute("role")));
        userObj.setAccount(userAccount);
        userObj.setUserId(employee.getLongAttribute("_id"));
        userObj.setFavorite(employee.getLongAttribute("favorite"));
        userObj.setStatus(employee.getIntAttribute("status"));
        userObj.setRegistered(employee.getBooleanAttribute("registered"));
        userObj.setFromSrc(employee.getStringAttribute("from"));
        return userObj;
    }

    private List<GrantedAuthority> createGrantedAuthorities(String userId, int userRole) {
        List<GrantedAuthority> grantedAuthorities = new ArrayList<>();
        if (userRole == 0) {
            logger.warn("该用户的角色未设置 userid={}", userId);
        } else if (userRole == 1) {
            grantedAuthorities.add(new SimpleGrantedAuthority("ROLE_READONLY"));
        } else if (userRole == 2) {
            grantedAuthorities.add(new SimpleGrantedAuthority("ROLE_WRITABLE"));
        } else if (userRole == 8) {
            grantedAuthorities.add(new SimpleGrantedAuthority("PROJ_MNG_USER"));
        } else if (userRole == 9) {
            grantedAuthorities.add(new SimpleGrantedAuthority("ADMIN_USER"));
        } else {
            logger.warn("该用户的角色设置不正确 userid={}，role={}", userId, userRole);
        }
        return grantedAuthorities;
    }

}
